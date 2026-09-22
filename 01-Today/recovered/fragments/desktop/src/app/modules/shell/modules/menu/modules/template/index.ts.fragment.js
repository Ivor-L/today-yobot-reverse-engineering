// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/index.ts.
// The original TypeScript and import graph are not restored.








class ShellMenuTemplate {
    validateContributions() {
        validateShellMenuContributions(this.groups, this.items);
    }
    create() {
        const groups = this.groups.filter((group)=>group.supports(this.context.platform));
        groups.sort(compareShellMenuGroups);
        const renderedItems = this.renderItems();
        const template = [];
        for (const group of groups){
            const items = addSectionSeparators(renderedItems.get(group.id) ?? []);
            const groupOptions = group.create(items);
            if (groupOptions) {
                template.push(groupOptions);
            }
        }
        return template;
    }
    renderItems() {
        const renderedByGroup = new Map();
        for (const item of this.items){
            if (!item.supports(this.context.platform)) {
                continue;
            }
            const options = item.create();
            if (!options) {
                continue;
            }
            assertShellMenuAction(item.id, options);
            const localizedOptions = this.localizeMacRole(options);
            const rendered = renderedByGroup.get(item.groupId) ?? [];
            rendered.push({
                item,
                options: localizedOptions
            });
            renderedByGroup.set(item.groupId, rendered);
        }
        for (const rendered of renderedByGroup.values()){
            rendered.sort(compareRenderedShellMenuItems);
        }
        return renderedByGroup;
    }
    localizeMacRole(options) {
        if (this.context.platform !== 'darwin' || !('role' in options)) {
            return options;
        }
        const label = resolveMacMenuRoleLabel(options.role, this.context.copy);
        if (!label) {
            return options;
        }
        return {
            ...options,
            label
        };
    }
}
__decorate([
    multiInject(SHELL_MENU_GROUP),
    __metadata("design:type", Object)
], ShellMenuTemplate.prototype, "groups", void 0);
__decorate([
    multiInject(SHELL_MENU_ITEM),
    __metadata("design:type", Object)
], ShellMenuTemplate.prototype, "items", void 0);
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellMenuTemplate.prototype, "context", void 0);
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShellMenuTemplate.prototype, "validateContributions", null);
ShellMenuTemplate = __decorate([
    injectable()
], ShellMenuTemplate);
