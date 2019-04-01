/**
 * Created on 31.08.2017.
 */

const page = require('../page');
const elements = require('../../libs/elements');
const appConst = require('../../libs/app_const');

const dialog = {
    container: `//div[contains(@id,'NewPrincipalDialog')]`,
    itemViewer: `//div[contains(@id,'UserTypesTreeGridItemViewer')]`,
    header: `//h2[@class='title']`,
    expanderIconByName: function (name) {
        return elements.itemByDisplayName(name) +
               `/ancestor::div[contains(@class,'slick-cell')]/span[contains(@class,'collapse') or contains(@class,'expand')]`;
    },
};
const newPrincipalDialog = Object.create(page, {

    header: {
        get: function () {
            return `${dialog.container}${dialog.header}`;
        }
    },
    cancelButton: {
        get: function () {
            return `${dialog.container}${elements.CANCEL_BUTTON_TOP}`;
        }
    },
    clickOnCancelButtonTop: {
        value: function () {
            return this.doClick(this.cancelButton).catch((err) => {
                this.saveScreenshot('err_principal_dialog');
                throw new Error('Error when try click on cancel button ' + err);
            })
        }
    },
    clickOnItem: {
        value: function (itemName) {
            let selector = `${dialog.itemViewer}` + `${elements.itemByDisplayName(itemName)}`;
            return this.waitForVisible(selector, 4000).then(() => {
                return this.doClick(selector);
            })
        }
    },
    waitForOpened: {
        value: function () {
            return this.waitForVisible(`${dialog.container}`, 3000).catch(err => {
                this.saveScreenshot('err_principal_dialog_load');
                throw new Error('NewPrincipal dialog was not loaded! ' + err);
            });
        }
    },
    waitForClosed: {
        value: function () {
            return this.waitForNotVisible(`${dialog.container}`, 3000).catch(error => {
                this.saveScreenshot('err_principal_dialog_close');
                throw new Error('New Principal Dialog was not closed');
            });
        }
    },
    getNumberOfItems: {
        value: function () {
            let items = `${dialog.itemViewer}` + `${elements.H6_DISPLAY_NAME}`;
            return this.numberOfElements(items)
        }
    },
    getItemNames: {
        value: function () {
            let items = `${dialog.itemViewer}` + `${elements.H6_DISPLAY_NAME}`;
            return this.getTextFromElements(items);
        }
    },
    getHeaderText: {
        value: function () {
            return this.getText(this.header);
        }
    },
    waitForExpanderIconDisplayed: {
        value: function (name) {
            let selector = dialog.container + dialog.expanderIconByName(name);
            return this.waitForVisible(selector, appConst).catch(err => {
                console.log("Expander is not visible " + err);
                return false;
            })
        }
    },
    clickOnExpanderIcon: {
        value: function (name) {
            let selector = dialog.container + dialog.expanderIconByName(name);
            return this.waitForExpanderIconDisplayed(name).then(result => {
                if (!result) {
                    throw new Error("Expander was not found! " + name);
                }
               return this.doClick(selector).pause(500);
            })
        }
    },
    waitForProviderNameDisplayed: {
        value: function (name) {
            let selector = dialog.container + dialog.itemViewer + elements.itemByName(name);
            return this.waitForVisible(selector, appConst.TIMEOUT_2);
        }
    },
});
module.exports = newPrincipalDialog;
