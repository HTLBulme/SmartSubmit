-- Nullable fields preserve every existing local and Google account.
ALTER TABLE `User`
    ADD COLUMN `ldapExternalId` VARCHAR(255) NULL,
    ADD COLUMN `ldapUid` VARCHAR(255) NULL,
    ADD COLUMN `ldapDn` VARCHAR(1024) NULL;

CREATE UNIQUE INDEX `User_ldapExternalId_key` ON `User`(`ldapExternalId`);
CREATE UNIQUE INDEX `User_ldapUid_key` ON `User`(`ldapUid`);
