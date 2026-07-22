/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Copyright (C) 2025 Red Hat, Inc.
 */

import React, { useState } from 'react';

import { Button } from '@patternfly/react-core/dist/esm/components/Button';
import { Form, FormGroup } from '@patternfly/react-core/dist/esm/components/Form';
import {
    Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant
} from '@patternfly/react-core/dist/esm/components/Modal';
import { TextInput } from '@patternfly/react-core/dist/esm/components/TextInput';
import { Stack } from '@patternfly/react-core/dist/esm/layouts/Stack';

import cockpit from 'cockpit';
import { FormHelper } from 'cockpit-components-form-helper';
import { InlineNotification } from 'cockpit-components-inline-notification';
import type { Dialogs, DialogResult } from 'dialogs';
import { fmt_to_fragments } from 'utils';

import { checkFilename, useFilesContext } from '../common.ts';
import type { FolderFileInfo } from '../common.ts';

const _ = cockpit.gettext;

const CompressItemModal = ({ dialogResult, path, selected } : {
    dialogResult: DialogResult<void>
    path: string,
    selected: FolderFileInfo,
}) => {
    const { cwdInfo } = useFilesContext();
    const [name, setName] = useState(`${selected.name}.tar.gz`);
    const [nameError, setNameError] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const [compressing, setCompressing] = useState(false);

    const compressItem = () => {
        const error = checkFilename(name, cwdInfo?.entries || {});
        if (error) {
            setNameError(error);
            return;
        }

        setCompressing(true);
        // Create the archive in the current directory. "-C path" makes the
        // archive contents relative to the parent, so it unpacks as
        // "<selected.name>/..." rather than baking in the absolute path.
        cockpit.spawn(
            ["tar", "-czf", path + name, "-C", path, selected.name],
            { superuser: "try", err: "message" }
        )
                .then(() => dialogResult.resolve())
                .catch(err => {
                    setErrorMessage(err.message);
                    setCompressing(false);
                });
    };

    return (
        <Modal
          position="top"
          variant={ModalVariant.small}
          isOpen
          onClose={() => dialogResult.resolve()}
        >
            <ModalHeader
              title={fmt_to_fragments(
                  _("Compress $0?"), <b className="ct-heading-font-weight">{selected.name}</b>)}
            />
            <ModalBody>
                <Stack>
                    {errorMessage !== undefined &&
                    <InlineNotification
                      type="danger"
                      text={errorMessage}
                      isInline
                    />}
                    <Form
                      isHorizontal onSubmit={e => {
                          e.preventDefault();
                          compressItem();
                          return false;
                      }}
                    >
                        <FormGroup fieldId="compress-item-input" label={_("Archive name")}>
                            <TextInput
                              autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                              value={name}
                              onChange={(_, val) => {
                                  setNameError(checkFilename(val, cwdInfo?.entries || {}));
                                  setErrorMessage(undefined);
                                  setName(val);
                              }}
                              id="compress-item-input"
                              isDisabled={compressing}
                            />
                            <FormHelper fieldId="compress-item-input" helperTextInvalid={nameError} />
                        </FormGroup>
                    </Form>
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Button
                  variant="primary"
                  onClick={compressItem}
                  isLoading={compressing}
                  isDisabled={compressing || errorMessage !== undefined || nameError !== null}
                >
                    {compressing ? _("Compressing…") : _("Compress")}
                </Button>
                <Button
                  variant="link"
                  onClick={() => dialogResult.resolve()}
                  isDisabled={compressing}
                >
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export function show_compress_dialog(dialogs: Dialogs, path: string, selected: FolderFileInfo) {
    dialogs.run(CompressItemModal, { path, selected });
}
