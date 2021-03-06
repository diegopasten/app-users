import * as Q from 'q';
import {UserTreeGridItem, UserTreeGridItemBuilder, UserTreeGridItemType} from './UserTreeGridItem';
import {UserTreeGridActions} from './UserTreeGridActions';
import {EditPrincipalEvent} from './EditPrincipalEvent';
import {UserItemsRowFormatter} from './UserItemsRowFormatter';
import {ListIdProvidersRequest} from '../../graphql/idprovider/ListIdProvidersRequest';
import {ListPrincipalsRequest, ListPrincipalsResult} from '../../graphql/principal/ListPrincipalsRequest';
import {PrincipalBrowseSearchData} from './filter/PrincipalBrowseSearchData';
import {UserItemType} from './UserItemType';
import {ListUserItemsRequest} from '../../graphql/principal/ListUserItemsRequest';
import {IdProvider} from '../principal/IdProvider';
import {TreeGrid} from 'lib-admin-ui/ui/treegrid/TreeGrid';
import {TreeNode} from 'lib-admin-ui/ui/treegrid/TreeNode';
import {TreeGridBuilder} from 'lib-admin-ui/ui/treegrid/TreeGridBuilder';
import {TreeGridContextMenu} from 'lib-admin-ui/ui/treegrid/TreeGridContextMenu';
import {Principal} from 'lib-admin-ui/security/Principal';
import {PrincipalType} from 'lib-admin-ui/security/PrincipalType';
import {BrowseFilterResetEvent} from 'lib-admin-ui/app/browse/filter/BrowseFilterResetEvent';
import {BrowseFilterSearchEvent} from 'lib-admin-ui/app/browse/filter/BrowseFilterSearchEvent';
import {ResponsiveRanges} from 'lib-admin-ui/ui/responsive/ResponsiveRanges';
import {UserItem} from 'lib-admin-ui/security/UserItem';
import {IdProviderKey} from 'lib-admin-ui/security/IdProviderKey';
import {Body} from 'lib-admin-ui/dom/Body';
import {i18n} from 'lib-admin-ui/util/Messages';

export class UserItemsTreeGrid
    extends TreeGrid<UserTreeGridItem> {

    private treeGridActions: UserTreeGridActions;
    private searchString: string;
    private searchTypes: UserItemType[];

    constructor() {

        const builder = new TreeGridBuilder<UserTreeGridItem>().setColumnConfig([{
            name: i18n('field.name'),
            id: 'name',
            field: 'displayName',
            formatter: UserItemsRowFormatter.nameFormatter,
            style: {minWidth: 200}
        }]).setPartialLoadEnabled(true).setLoadBufferSize(20).prependClasses('user-tree-grid');

        const columns = builder.getColumns().slice(0);
        const [nameColumn] = columns;

        const updateColumns = () => {
            let checkSelIsMoved = ResponsiveRanges._540_720.isFitOrSmaller(Body.get().getEl().getWidth());

            const curClass = nameColumn.getCssClass();

            if (checkSelIsMoved) {
                nameColumn.setCssClass(curClass || 'shifted');
            } else if (curClass && curClass.indexOf('shifted') >= 0) {
                nameColumn.setCssClass(curClass.replace('shifted', ''));
            }

            this.setColumns(columns.slice(0), checkSelIsMoved);
        };

        builder.setColumnUpdater(updateColumns);

        super(builder);

        this.treeGridActions = new UserTreeGridActions(this);

        this.setContextMenu(new TreeGridContextMenu(this.treeGridActions));

        this.initEventHandlers();
    }

    private initEventHandlers() {
        BrowseFilterSearchEvent.on((event: BrowseFilterSearchEvent<PrincipalBrowseSearchData>) => {
            const data = event.getData();
            const items = data.getUserItems().map((userItem: UserItem) => {
                return new UserTreeGridItemBuilder().setAny(userItem).build();
            });
            this.searchString = data.getSearchString();
            this.searchTypes = data.getTypes();
            this.filter(items);
            this.notifyLoaded();
        });

        BrowseFilterResetEvent.on(() => {
            this.resetFilter();
        });

        this.getGrid().subscribeOnDblClick((event, data) => {

            if (this.isActive()) {
                const node: TreeNode<UserTreeGridItem> = this.getGrid().getDataView().getItem(data.row);
                this.editItem(node);
            }
        });
    }

    protected editItem(node: TreeNode<UserTreeGridItem>) {
        if (this.isUserItemEditable(node.getData())) {
            new EditPrincipalEvent([node.getData()]).fire();
        }
    }

    private isUserItemEditable(userItem: UserTreeGridItem): boolean {
        return !(userItem.isRole() || userItem.isUserGroup() || userItem.isUser());
    }

    isEmptyNode(node: TreeNode<UserTreeGridItem>): boolean {
        return !node.getDataId() || node.getDataId() === '';
    }

    getTreeGridActions(): UserTreeGridActions {
        return this.treeGridActions;
    }

    updateUserNode(principal: Principal, idProvider: IdProvider) {
        if (!principal && !idProvider) {
            return;
        }

        let userTreeGridItem: UserTreeGridItem;
        const builder: UserTreeGridItemBuilder = new UserTreeGridItemBuilder();

        if (!principal) { // IdProvider type
            userTreeGridItem = builder.setIdProvider(idProvider).setType(UserTreeGridItemType.ID_PROVIDER).build();
        } else {         // Principal type
            userTreeGridItem = builder.setPrincipal(principal).setType(UserTreeGridItemType.PRINCIPAL).build();
        }

        const nodeList: TreeNode<UserTreeGridItem>[] = this.getRoot().getCurrentRoot().treeToList();

        nodeList.forEach((node) => {
            if (node.getDataId() === userTreeGridItem.getDataId()) {
                node.setData(userTreeGridItem);
                node.clearViewers();
            }
        });

        this.initData(nodeList);
        this.invalidate();
    }

    deleteNodes(userTreeGridItemsToDelete: UserTreeGridItem[]) {
        if (this.isSingleItemSelected() && this.isHighlightedItemIn(userTreeGridItemsToDelete)) {
            this.removeHighlighting();
        }

        super.deleteNodes(userTreeGridItemsToDelete);
    }

    appendUserNode(principal: Principal, idProvider: IdProvider, parentOfSameType?: boolean) {
        if (!principal) {
            this.appendIdProviderUserNode(idProvider);
        } else {
            this.appendPrincipalNode(principal, idProvider, parentOfSameType);
        }
    }

    private appendIdProviderUserNode(idProvider: IdProvider) {
        const userTreeGridItem = new UserTreeGridItemBuilder().setIdProvider(idProvider).setType(
            UserTreeGridItemType.ID_PROVIDER).build();

        this.appendNode(userTreeGridItem, true, false, this.getRoot().isFiltered() ? this.getRoot().getDefaultRoot() : null);

        if (!this.getRoot().isFiltered()) {
            this.initData(this.getRoot().getDefaultRoot().treeToList());
            this.invalidate();
        }
    }

    private appendPrincipalNode(principal: Principal, idProvider: IdProvider, parentOfSameType?: boolean) {
        const userTreeGridItem = new UserTreeGridItemBuilder().setPrincipal(principal).setType(UserTreeGridItemType.PRINCIPAL).build();

        if (parentOfSameType) {
            this.appendNode(userTreeGridItem, parentOfSameType, false);
            return;
        }

        this.loadParentNode(principal, idProvider).then((parentNode) => this.appendNodeToParent(parentNode, userTreeGridItem));
    }

    fetchChildren(parentNode?: TreeNode<UserTreeGridItem>): Q.Promise<UserTreeGridItem[]> {
        parentNode = parentNode || this.getRoot().getCurrentRoot();

        let level: number = parentNode ? parentNode.calcLevel() : 0;

        // Creating a role with parent node pointing to another role may cause fetching to fail
        // We need to select a parent node first
        if (level !== 0 && parentNode.getData().getPrincipal() &&
            parentNode.getData().isPrincipal() &&
            parentNode.getData().getPrincipal().isRole() && !!parentNode.getParent()) {

            parentNode = parentNode.getParent();
            level--;
        }

        if (level === 0) {
            return this.isFiltered() ? this.fetchFilteredItems() : this.fetchIdProvidersAndRoles();
        }

        if (parentNode.getData().isRole()) {
            return this.fetchRoles(parentNode);
        }

        if (level === 1) {
            return this.createUsersAndGroupsFolders(parentNode);
        }

        if (level === 2) {
            return this.fetchPrincipals(parentNode);
        }
    }

    private fetchFilteredItems(): Q.Promise<UserTreeGridItem[]> {
        return new ListUserItemsRequest().setTypes(this.searchTypes).setQuery(this.searchString).sendAndParse()
            .then((result) => {
                return result.userItems.map(item => new UserTreeGridItemBuilder().setAny(item).build());
            });
    }

    private fetchIdProvidersAndRoles(): Q.Promise<UserTreeGridItem[]> {
        return new ListIdProvidersRequest()
            .setSort('displayName ASC')
            .sendAndParse()
            .then((idProviders: IdProvider[]) => {
                const gridItems: UserTreeGridItem[] = [];
                gridItems.push(new UserTreeGridItemBuilder().setType(UserTreeGridItemType.ROLES).build());
                idProviders.forEach((idProvider: IdProvider) => {
                    gridItems.push(
                        new UserTreeGridItemBuilder().setIdProvider(idProvider).setType(UserTreeGridItemType.ID_PROVIDER).build());
                });

                return gridItems;
            });
    }

    private fetchRoles(parentNode: TreeNode<UserTreeGridItem>): Q.Promise<UserTreeGridItem[]> {
        return this.loadChildren(parentNode, [PrincipalType.ROLE]);
    }

    private createUsersAndGroupsFolders(parentNode: TreeNode<UserTreeGridItem>): Q.Promise<UserTreeGridItem[]> {
        const idProviderNode: UserTreeGridItem = parentNode.getData();
        if (idProviderNode.isIdProvider()) {
            return Q(this.addUsersGroupsToIdProvider(idProviderNode));
        }

        return Q([]);
    }

    private addUsersGroupsToIdProvider(parentItem: UserTreeGridItem): UserTreeGridItem[] {
        const items: UserTreeGridItem[] = [];
        const idProvider: IdProvider = parentItem.getIdProvider();
        const userFolderItem: UserTreeGridItem =
            new UserTreeGridItemBuilder().setIdProvider(idProvider).setType(UserTreeGridItemType.USERS).build();
        const groupFolderItem: UserTreeGridItem =
            new UserTreeGridItemBuilder().setIdProvider(idProvider).setType(UserTreeGridItemType.GROUPS).build();
        items.push(userFolderItem);
        items.push(groupFolderItem);

        return items;
    }

    private fetchPrincipals(parentNode: TreeNode<UserTreeGridItem>): Q.Promise<UserTreeGridItem[]> {
        const folder: UserTreeGridItem = <UserTreeGridItem>parentNode.getData();
        const principalType: PrincipalType = this.getPrincipalTypeForFolderItem(folder.getType());

        return this.loadChildren(parentNode, [principalType]);
    }

    private getNodeToUpdate(node: TreeNode<UserTreeGridItem>): TreeNode<UserTreeGridItem> {
        const usersOrGroupsUpdating = node.getData().isUser() || node.getData().isUserGroup();
        const selectedData = this.getSelectedDataList()[0];
        const idProviderSelected = selectedData && selectedData.isIdProvider();

        return (usersOrGroupsUpdating && idProviderSelected) ? node.getParent() : node;
    }

    protected updateSelectedNode(node: TreeNode<UserTreeGridItem>) {
        // Highlighted nodes should remain as is, and must not be selected
        const firstSelectedOrHighlighted = this.getFirstSelectedOrHighlightedNode();
        const selected = this.getRoot().getFullSelection().length > 0;
        const highlighted = !selected && !!firstSelectedOrHighlighted;

        const nodeToUpdate = this.getNodeToUpdate(node);
        if (highlighted) {
            this.refreshNode(nodeToUpdate);
        } else if (selected) {
            super.updateSelectedNode(nodeToUpdate);
        }
    }

    getDataId(item: UserTreeGridItem): string {
        return item.getDataId();
    }

    hasChildren(item: UserTreeGridItem): boolean {
        return item.hasChildren();
    }

    private loadParentNode(principal: Principal, idProvider: IdProvider): Q.Promise<TreeNode<UserTreeGridItem>> {
        if (principal.isRole()) {
            return this.loadRolesNode();
        }

        return this.loadPrincipalNode(principal, idProvider);
    }

    private loadRolesNode(): Q.Promise<TreeNode<UserTreeGridItem>> {
        const rootNode: TreeNode<UserTreeGridItem> = this.isFiltered() ? this.getRoot().getFilteredRoot() : this.getRoot().getCurrentRoot();

        const rolesNode: TreeNode<UserTreeGridItem> = rootNode.getChildren()
            .filter(node => node.getData() && node.getData().getType() === UserTreeGridItemType.ROLES)[0];

        return rolesNode ? this.fetchDataAndSetNodes(rolesNode).then(() => rolesNode) : Q(null);
    }

    private loadPrincipalNode(principal: Principal, idProvider: IdProvider): Q.Promise<TreeNode<UserTreeGridItem>> {
        const rootNode: TreeNode<UserTreeGridItem> = this.isFiltered() ? this.getRoot().getFilteredRoot() : this.getRoot().getCurrentRoot();
        const idProviderId: string = idProvider.getKey().getId();
        const idProviderNode: TreeNode<UserTreeGridItem> =
            rootNode.getChildren().filter(node => node.getDataId() === idProviderId)[0] || rootNode;

        return this.fetchDataAndSetNodes(idProviderNode).then(() => {
            const parentItemType = UserTreeGridItem.getParentType(principal);

            const parentNode: TreeNode<UserTreeGridItem> =
                idProviderNode.getChildren().filter(node => node.getData().getType() === parentItemType)[0];

            return this.fetchDataAndSetNodes(parentNode).then(() => parentNode);
        });
    }

    private loadChildren(parentNode: TreeNode<UserTreeGridItem>, allowedTypes: PrincipalType[]): Q.Promise<UserTreeGridItem[]> {
        this.removeEmptyNode(parentNode);
        const from: number = parentNode.getChildren().length;
        const gridItems: UserTreeGridItem[] = parentNode.getChildren().map((el) => el.getData()).slice(0, from);

        return new ListPrincipalsRequest()
            .setIdProviderKey(this.getIdProviderKey(parentNode))
            .setTypes(allowedTypes)
            .setSort('displayName ASC')
            .setStart(from)
            .setCount(10)
            .sendAndParse()
            .then((result: ListPrincipalsResult) => {
                const principals: Principal[] = result.principals;

                principals.forEach((principal: Principal) => {
                    gridItems.push(
                        new UserTreeGridItemBuilder().setPrincipal(principal).setType(UserTreeGridItemType.PRINCIPAL).build());
                });

                if (from + principals.length < result.total) {
                    gridItems.push(UserTreeGridItem.create().build());
                }

                return gridItems;
            });
    }

    private removeEmptyNode(parentNode: TreeNode<UserTreeGridItem>) {
        parentNode.getChildren().some((child: TreeNode<UserTreeGridItem>, index: number) => {
            if (!child.getData().getDataId()) {
                parentNode.getChildren().splice(index, 1);
                return true;
            }

            return false;
        });
    }

    private getIdProviderKey(parentNode: TreeNode<UserTreeGridItem>): IdProviderKey {
        // fetch principals from the id provider, if parent node 'Groups' or 'Users' was selected
        if (!parentNode.getData().isRole()) {
            const idProviderNode: UserTreeGridItem = parentNode.getParent().getData();
            return idProviderNode.getIdProvider().getKey();
        }

        return null;
    }

    refreshNodeData(parentNode: TreeNode<UserTreeGridItem>): Q.Promise<TreeNode<UserTreeGridItem>> {
        return Q(parentNode);
    }

    private getPrincipalTypeForFolderItem(itemType: UserTreeGridItemType): PrincipalType {
        if (itemType === UserTreeGridItemType.GROUPS) {
            return PrincipalType.GROUP;
        }

        if (itemType === UserTreeGridItemType.USERS) {
            return PrincipalType.USER;
        }

        throw new Error('Invalid item type for folder with principals: ' + UserTreeGridItemType[itemType]);
    }

    private isSingleItemSelected(): boolean {
        return this.getSelectedDataList().length === 1;
    }

    private isHighlightedItemIn(userTreeGridItems: UserTreeGridItem[]): boolean {
        return userTreeGridItems.some((userTreeGridItem: UserTreeGridItem) => {
            return userTreeGridItem.getDataId() === this.getFirstSelectedOrHighlightedNode().getDataId();
        });
    }

}
