/**
 * Created on 20.03.2018.
 */

const Page = require('../page');
const lib = require('../../libs/elements');
const appConst = require('../../libs/app_const');
const XPATH = {
    container: `//div[contains(@id,'ApplicationConfiguratorDialog')]`,
    domainInput: "//input[contains(@id,'TextInput') and contains(@name,'appDomain')]",
    clientIdInput: "//input[contains(@id,'TextInput') and contains(@name,'appClientId')]",
    clientSecretInput: "//input[contains(@id,'TextInput') and contains(@name,'appSecret')]",
    applyButton: `//button[contains(@id,'DialogButton')]/span[text()='Apply']`,
    cancelButton: `//button[contains(@id,'DialogButton')]/span[text()='Cancel']`,
    selectedProviderView: `//div[contains(@id,'AuthApplicationSelectedOptionView')]`,
    idProviderTabItem: "//li[contains(@id,'TabBarItem') and child::a[contains(.,'Id Provider')]]",
    permissionsTabItem: "//li[contains(@id,'TabBarItem') and child::a[contains(.,'Permissions')]]"
};
class IdProviderConfiguratorDialog extends Page {

    get applyButton() {
        return `${XPATH.container}` + `${XPATH.applyButton}`;
    }

    get domainInput() {
        return `${XPATH.container}` + `${XPATH.domainInput}`;
    }

    get clientSecretInput() {
        return `${XPATH.container}` + `${XPATH.clientSecretInput}`;
    }

    get cancelButton() {
        return `${XPATH.container}` + `${XPATH.cancelButton}`;
    }

    get clientIdInput() {
        return XPATH.container + XPATH.clientIdInput;
    }

    waitForDialogOpened() {
        return this.waitForElementDisplayed(`${XPATH.container}`, appConst.TIMEOUT_3);
    }

    clickOnCancelTopButton() {
        return this.clickOnElement(this.cancelButtonTop);
    }

    clickOnApplyButton() {

        return this.clickOnElement(this.applyButton);
    }

    clickOnCancelButton() {
        return this.clickOnElement(this.cancelButton);
    }

    cancelButtonTop() {
        return XPATH.container + lib.CANCEL_BUTTON_TOP;
    }

    isDomainInputDisplayed() {
        return this.isElementEnabled(this.domainInput);
    }

    waitForClosed() {
        return this.waitForElementNotDisplayed(XPATH.container, appConst.TIMEOUT_3).catch(error => {
            throw new Error('ID Provider config Dialog was not closed');
        });
    }

    typeInDomainInput(domain) {
        return this.typeTextInInput(this.domainInput, domain).catch(err => {
            this.saveScreenshot('err_type_domainInput');
            throw new Error(err);
        })
    }

    typeInClientSecretInput(text) {
        return this.typeTextInInput(this.clientSecretInput, text).catch(err => {
            this.saveScreenshot('err_type_secretInput');
            throw new Error(err);
        })
    }

    typeInClientIdInput(clientId) {
        return this.typeTextInInput(this.clientIdInput, clientId).catch(err => {
            this.saveScreenshot('err_type_clientIdInput');
            throw new Error(err);
        });
    }

    openDialogFillRequiredInputs(domain, clientId, clientSecret) {
        let editButton = XPATH.selectedProviderView + lib.EDIT_ICON;
        return this.clickOnElement(XPATH.permissionsTabItem).then(() => {
            return this.clickOnElement(XPATH.idProviderTabItem);
        }).then(() => {
            return this.pause(700);
        }).then(() => {
            return this.waitForElementDisplayed(editButton, appConst.TIMEOUT_3);
        }).then(result => {
            return this.clickOnElement(editButton);
        }).then(() => {
            return this.waitForDialogOpened();
        }).then(() => {
            return this.typeInDomainInput(domain);
        }).then(() => {
            return this.typeInClientIdInput(clientId);
        }).then(() => {
            return this.typeInClientSecretInput(clientSecret);
        }).then(() => {
            return this.clickOnApplyButton();
        }).then(() => {
            return this.waitForClosed();
        }).then(() => {
            return this.pause(500)
        });
    }
};
module.exports = IdProviderConfiguratorDialog;

