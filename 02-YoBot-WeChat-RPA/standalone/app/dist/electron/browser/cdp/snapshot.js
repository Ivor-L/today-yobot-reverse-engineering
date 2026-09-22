export class CDPSnapshot {
    client = null;
    nodeMap = new Map();
    async attach(page) {
        try {
            this.client = await page.context().newCDPSession(page);
        }
        catch (e) {
            console.error('Failed to attach CDP session', e);
            throw e;
        }
    }
    async detach() {
        if (this.client) {
            await this.client.detach();
            this.client = null;
        }
    }
    getSession() {
        return this.client;
    }
    async capture() {
        if (!this.client)
            throw new Error('CDP session not attached');
        try {
            const { nodes } = await this.client.send('Accessibility.getFullAXTree');
            return this.processNodes(nodes);
        }
        catch (e) {
            console.error('Failed to capture snapshot via CDP', e);
            throw e;
        }
    }
    getNode(nodeId) {
        return this.nodeMap.get(nodeId);
    }
    processNodes(nodes) {
        this.nodeMap.clear();
        let root = null;
        // First pass: map nodes and find root
        for (const node of nodes) {
            this.nodeMap.set(node.nodeId, node);
            if (node.role?.value === 'RootWebArea' || node.role?.value === 'WebArea') {
                if (!root)
                    root = node;
            }
        }
        if (!root && nodes.length > 0) {
            root = nodes[0];
        }
        if (!root)
            return '';
        return this.serializeNode(root, 0);
    }
    serializeNode(node, depth) {
        if (node.ignored) {
            // If ignored, skip this node but process children
            let output = '';
            const childIds = node.childIds || [];
            for (const childId of childIds) {
                const child = this.nodeMap.get(childId);
                if (child) {
                    output += this.serializeNode(child, depth);
                }
            }
            return output;
        }
        const role = node.role?.value || 'unknown';
        // console.log(`Serializing ${node.nodeId} (${role})`);
        const indent = '  '.repeat(depth);
        let attributes = ` id="${node.nodeId}"`;
        if (node.name?.value)
            attributes += ` name="${this.escape(node.name.value)}"`;
        if (node.value?.value)
            attributes += ` value="${this.escape(node.value.value)}"`;
        if (node.description?.value)
            attributes += ` description="${this.escape(node.description.value)}"`;
        if (node.properties) {
            for (const prop of node.properties) {
                if (prop.name === 'url' && prop.value?.value) {
                    attributes += ` url="${this.escape(prop.value.value)}"`;
                }
            }
        }
        let output = `${indent}<${role}${attributes}`;
        const childIds = node.childIds || [];
        if (childIds.length === 0) {
            output += ' />\n';
        }
        else {
            output += '>\n';
            for (const childId of childIds) {
                const child = this.nodeMap.get(childId);
                if (child) {
                    output += this.serializeNode(child, depth + 1);
                }
                else {
                    // Debugging missing child
                    // console.warn(`Child ${childId} not found in nodeMap (parent: ${node.nodeId})`);
                }
            }
            output += `${indent}</${role}>\n`;
        }
        return output;
    }
    escape(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, '&#10;');
    }
}
