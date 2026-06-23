export interface TemplateVariable {
  name: string;
  description: string;
}

export interface EmailTemplateDefinition {
  subject: string;
  html: string;
  variables: TemplateVariable[];
  sampleData: Record<string, string>;
}

export interface NotificationTemplateSet {
  immediate?: EmailTemplateDefinition;
  digest?: EmailTemplateDefinition;
}

const sampleItemsTableRows = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Widget A</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">WDG-001</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">2</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">10</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Gadget B</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">GDG-002</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">0</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">5</td>
      </tr>`;

const sampleExpiringTableRows = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Old Widget</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">OW-001</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #f59e0b; font-weight: bold;">2 days</td>
      </tr>`;

const sampleCreatedDigestRows = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">New Widget</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">NW-001</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Electronics</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">admin</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">2/10/2026, 10:00:00 AM</td>
      </tr>`;

const sampleQuarantinedDigestRows = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Deleted Item</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">DEL-001</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">admin</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">2/10/2026, 9:00:00 AM</td>
      </tr>`;

const sampleFailedLoginDigestRows = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">john.doe</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">7</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">3</td>
      </tr>`;

const samplePermissionDigestRows = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Role Updated</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Manager</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Added items:delete permission</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">admin</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">2/10/2026, 11:00:00 AM</td>
      </tr>`;

export const DEFAULT_EMAIL_TEMPLATES: Record<string, NotificationTemplateSet> = {
  low_stock: {
    immediate: {
      subject: 'Low Stock Alert - {{itemCount}} item(s) below minimum',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Low Stock Alert</h2>
      <p>The following items are below their minimum stock level:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Item Name</th>
            <th style="padding: 8px; text-align: left;">SKU</th>
            <th style="padding: 8px; text-align: left;">Current Qty</th>
            <th style="padding: 8px; text-align: left;">Min Qty</th>
          </tr>
        </thead>
        <tbody>
          {{itemsTableRows}}
        </tbody>
      </table>
      <p><a href="{{frontendUrl}}/items?lowStock=true" style="color: #3b82f6;">View low stock items in Warehouse</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'itemCount', description: 'Number of low stock items' },
        { name: 'itemsTableRows', description: 'Pre-built HTML table rows for each low stock item' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        itemCount: '2',
        itemsTableRows: sampleItemsTableRows,
        frontendUrl: 'https://warehouse.example.com',
      },
    },
  },

  item_quarantined: {
    immediate: {
      subject: 'Item Quarantined: {{itemName}}',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Item Moved to Quarantine</h2>
      <p>An item has been deleted and moved to quarantine:</p>
      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold;">Item Name:</td>
          <td style="padding: 8px;">{{itemName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">SKU:</td>
          <td style="padding: 8px;">{{sku}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Deleted By:</td>
          <td style="padding: 8px;">{{deletedBy}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Deleted At:</td>
          <td style="padding: 8px;">{{deletedAt}}</td>
        </tr>
      </table>
      <p>The item can be restored from the quarantine tab in settings.</p>
      <p><a href="{{frontendUrl}}/settings" style="color: #3b82f6;">Go to Settings</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'itemName', description: 'Name of the quarantined item' },
        { name: 'sku', description: 'SKU of the item' },
        { name: 'deletedBy', description: 'Username who deleted the item' },
        { name: 'deletedAt', description: 'Date/time the item was deleted' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        itemName: 'Widget A',
        sku: 'WDG-001',
        deletedBy: 'admin',
        deletedAt: '2/10/2026, 10:30:00 AM',
        frontendUrl: 'https://warehouse.example.com',
      },
    },
    digest: {
      subject: 'Quarantined Items Summary - {{itemCount}} item(s)',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Quarantined Items Summary</h2>
      <p>{{itemCount}} item(s) were moved to quarantine:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Item Name</th>
            <th style="padding: 8px; text-align: left;">SKU</th>
            <th style="padding: 8px; text-align: left;">Deleted By</th>
            <th style="padding: 8px; text-align: left;">Time</th>
          </tr>
        </thead>
        <tbody>
          {{itemsTableRows}}
        </tbody>
      </table>
      <p>These items can be restored from the quarantine tab in settings.</p>
      <p><a href="{{frontendUrl}}/settings" style="color: #3b82f6;">Go to Settings</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated digest notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'itemCount', description: 'Number of quarantined items' },
        { name: 'itemsTableRows', description: 'Pre-built HTML table rows for each quarantined item' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        itemCount: '1',
        itemsTableRows: sampleQuarantinedDigestRows,
        frontendUrl: 'https://warehouse.example.com',
      },
    },
  },

  quarantine_expiring: {
    immediate: {
      subject: 'Quarantine Expiration Warning - {{itemCount}} item(s)',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Quarantine Expiration Warning</h2>
      <p>The following quarantined items will be permanently deleted soon:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Item Name</th>
            <th style="padding: 8px; text-align: left;">SKU</th>
            <th style="padding: 8px; text-align: left;">Expires In</th>
          </tr>
        </thead>
        <tbody>
          {{itemsTableRows}}
        </tbody>
      </table>
      <p>To restore these items before they are permanently deleted, visit the quarantine tab in settings.</p>
      <p><a href="{{frontendUrl}}/settings" style="color: #3b82f6;">Go to Settings</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'itemCount', description: 'Number of expiring items' },
        { name: 'itemsTableRows', description: 'Pre-built HTML table rows for each expiring item' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        itemCount: '1',
        itemsTableRows: sampleExpiringTableRows,
        frontendUrl: 'https://warehouse.example.com',
      },
    },
  },

  failed_login: {
    immediate: {
      subject: 'Security Alert: {{failedAttempts}} failed login attempts for "{{username}}"',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Failed Login Alert</h2>
      <p>Multiple failed login attempts have been detected:</p>
      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold;">Username:</td>
          <td style="padding: 8px;">{{username}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Failed Attempts:</td>
          <td style="padding: 8px; color: #dc2626; font-weight: bold;">{{failedAttempts}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">IP Address:</td>
          <td style="padding: 8px;">{{ipAddress}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">User Agent:</td>
          <td style="padding: 8px; font-size: 12px;">{{userAgent}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Time:</td>
          <td style="padding: 8px;">{{time}}</td>
        </tr>
      </table>
      <p style="color: #dc2626;">This may indicate a brute force attack. Consider reviewing the account security.</p>
      <p><a href="{{frontendUrl}}/audit" style="color: #3b82f6;">View Audit Log</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated security notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'username', description: 'Username that failed to login' },
        { name: 'failedAttempts', description: 'Number of failed attempts' },
        { name: 'ipAddress', description: 'IP address of the login attempt' },
        { name: 'userAgent', description: 'Browser/client user agent string' },
        { name: 'time', description: 'Time of the failed attempt' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        username: 'john.doe',
        failedAttempts: '5',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        time: '2/10/2026, 10:30:00 AM',
        frontendUrl: 'https://warehouse.example.com',
      },
    },
    digest: {
      subject: 'Security Digest: {{incidentCount}} failed login incident(s)',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Failed Login Summary</h2>
      <p>Failed login attempts detected during the period:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Username</th>
            <th style="padding: 8px; text-align: left;">Total Failed Attempts</th>
            <th style="padding: 8px; text-align: left;">Incidents</th>
          </tr>
        </thead>
        <tbody>
          {{summaryTableRows}}
        </tbody>
      </table>
      <p style="color: #dc2626;">Review these attempts and consider account security measures if needed.</p>
      <p><a href="{{frontendUrl}}/audit" style="color: #3b82f6;">View Audit Log</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated security digest from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'incidentCount', description: 'Total number of failed login incidents' },
        { name: 'summaryTableRows', description: 'Pre-built HTML table rows grouped by username' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        incidentCount: '3',
        summaryTableRows: sampleFailedLoginDigestRows,
        frontendUrl: 'https://warehouse.example.com',
      },
    },
  },

  item_created: {
    immediate: {
      subject: 'New Item Added: {{itemName}}',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">New Item Added</h2>
      <p>A new item has been added to the inventory:</p>
      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold;">Item Name:</td>
          <td style="padding: 8px;">{{itemName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">SKU:</td>
          <td style="padding: 8px;">{{sku}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Category:</td>
          <td style="padding: 8px;">{{categoryName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Location:</td>
          <td style="padding: 8px;">{{locationName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Created By:</td>
          <td style="padding: 8px;">{{createdBy}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Created At:</td>
          <td style="padding: 8px;">{{createdAt}}</td>
        </tr>
      </table>
      <p><a href="{{frontendUrl}}/items/{{itemId}}" style="color: #3b82f6;">View Item Details</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'itemName', description: 'Name of the new item' },
        { name: 'sku', description: 'SKU of the item' },
        { name: 'categoryName', description: 'Category name (or empty)' },
        { name: 'locationName', description: 'Location name (or empty)' },
        { name: 'createdBy', description: 'Username who created the item' },
        { name: 'createdAt', description: 'Date/time the item was created' },
        { name: 'itemId', description: 'Unique ID of the item (for links)' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        itemName: 'New Widget',
        sku: 'NW-001',
        categoryName: 'Electronics',
        locationName: 'Warehouse A - Shelf 3',
        createdBy: 'admin',
        createdAt: '2/10/2026, 10:00:00 AM',
        itemId: 'abc-123-def',
        frontendUrl: 'https://warehouse.example.com',
      },
    },
    digest: {
      subject: 'New Items Summary - {{itemCount}} item(s) added',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">New Items Summary</h2>
      <p>{{itemCount}} new item(s) were added to the inventory:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Item Name</th>
            <th style="padding: 8px; text-align: left;">SKU</th>
            <th style="padding: 8px; text-align: left;">Category</th>
            <th style="padding: 8px; text-align: left;">Created By</th>
            <th style="padding: 8px; text-align: left;">Time</th>
          </tr>
        </thead>
        <tbody>
          {{itemsTableRows}}
        </tbody>
      </table>
      <p><a href="{{frontendUrl}}/items" style="color: #3b82f6;">View Items in Warehouse</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated digest notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'itemCount', description: 'Number of new items' },
        { name: 'itemsTableRows', description: 'Pre-built HTML table rows for each new item' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        itemCount: '1',
        itemsTableRows: sampleCreatedDigestRows,
        frontendUrl: 'https://warehouse.example.com',
      },
    },
  },

  permission_change: {
    immediate: {
      subject: 'Permission Change: {{changeType}} - {{entityName}}',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Permission Change Alert</h2>
      <p>A permission-related change has been made:</p>
      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold;">Change Type:</td>
          <td style="padding: 8px;">{{changeType}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Affected:</td>
          <td style="padding: 8px;">{{entityName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Details:</td>
          <td style="padding: 8px;">{{details}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Changed By:</td>
          <td style="padding: 8px;">{{changedBy}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Time:</td>
          <td style="padding: 8px;">{{time}}</td>
        </tr>
      </table>
      <p><a href="{{frontendUrl}}/audit" style="color: #3b82f6;">View Audit Log</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'changeType', description: 'Type of permission change (e.g., Role Updated)' },
        { name: 'entityName', description: 'Name of the affected entity' },
        { name: 'details', description: 'Details about the change' },
        { name: 'changedBy', description: 'Username who made the change' },
        { name: 'time', description: 'Time of the change' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        changeType: 'Role Updated',
        entityName: 'Manager',
        details: 'Added items:delete permission',
        changedBy: 'admin',
        time: '2/10/2026, 11:00:00 AM',
        frontendUrl: 'https://warehouse.example.com',
      },
    },
    digest: {
      subject: 'Permission Changes Summary - {{changeCount}} change(s)',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Permission Changes Summary</h2>
      <p>{{changeCount}} permission-related change(s) were made:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Change Type</th>
            <th style="padding: 8px; text-align: left;">Affected</th>
            <th style="padding: 8px; text-align: left;">Details</th>
            <th style="padding: 8px; text-align: left;">Changed By</th>
            <th style="padding: 8px; text-align: left;">Time</th>
          </tr>
        </thead>
        <tbody>
          {{changesTableRows}}
        </tbody>
      </table>
      <p><a href="{{frontendUrl}}/audit" style="color: #3b82f6;">View Audit Log</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated digest notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'changeCount', description: 'Number of permission changes' },
        { name: 'changesTableRows', description: 'Pre-built HTML table rows for each change' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        changeCount: '1',
        changesTableRows: samplePermissionDigestRows,
        frontendUrl: 'https://warehouse.example.com',
      },
    },
  },

  new_device: {
    immediate: {
      subject: 'New Device Registered: {{deviceName}}',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">New Device Registered</h2>
      <p>A new device has been registered to your account:</p>
      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold;">Device Name:</td>
          <td style="padding: 8px;">{{deviceName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Manufacturer:</td>
          <td style="padding: 8px;">{{manufacturer}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Model:</td>
          <td style="padding: 8px;">{{model}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Android Version:</td>
          <td style="padding: 8px;">{{androidVersion}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Registered At:</td>
          <td style="padding: 8px;">{{registeredAt}}</td>
        </tr>
      </table>
      <p>If you did not register this device, please block it immediately from your profile settings.</p>
      <p><a href="{{frontendUrl}}/profile" style="color: #3b82f6;">Go to Profile</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated security notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'deviceName', description: 'Name of the registered device' },
        { name: 'manufacturer', description: 'Device manufacturer' },
        { name: 'model', description: 'Device model' },
        { name: 'androidVersion', description: 'Android version of the device' },
        { name: 'registeredAt', description: 'Date/time the device was registered' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        deviceName: 'Pixel 7',
        manufacturer: 'Google',
        model: 'Pixel 7',
        androidVersion: '14',
        registeredAt: '2/10/2026, 10:00:00 AM',
        frontendUrl: 'https://warehouse.example.com',
      },
    },
  },

  blocked_device_attempt: {
    immediate: {
      subject: 'Security Alert: Blocked Device Access Attempt by {{username}}',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Blocked Device Access Attempt</h2>
      <p>A blocked device attempted to access the system:</p>
      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold;">User:</td>
          <td style="padding: 8px;">{{username}} ({{userEmail}})</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Device Name:</td>
          <td style="padding: 8px;">{{deviceName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Manufacturer:</td>
          <td style="padding: 8px;">{{manufacturer}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Model:</td>
          <td style="padding: 8px;">{{model}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">IP Address:</td>
          <td style="padding: 8px;">{{ipAddress}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Time:</td>
          <td style="padding: 8px;">{{time}}</td>
        </tr>
      </table>
      <p style="color: #dc2626;">This may indicate a security concern. The device was blocked and access was denied.</p>
      <p><a href="{{frontendUrl}}/devices" style="color: #3b82f6;">Manage Devices</a></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated security notification from Warehouse Inventory System
      </p>
    </div>`,
      variables: [
        { name: 'username', description: 'Username of the account' },
        { name: 'userEmail', description: 'Email of the user' },
        { name: 'deviceName', description: 'Name of the blocked device' },
        { name: 'manufacturer', description: 'Device manufacturer' },
        { name: 'model', description: 'Device model' },
        { name: 'ipAddress', description: 'IP address of the access attempt' },
        { name: 'time', description: 'Time of the access attempt' },
        { name: 'frontendUrl', description: 'Base URL of the frontend application' },
      ],
      sampleData: {
        username: 'john.doe',
        userEmail: 'john@example.com',
        deviceName: 'Unknown Device',
        manufacturer: 'Samsung',
        model: 'Galaxy S21',
        ipAddress: '192.168.1.100',
        time: '2/10/2026, 10:30:00 AM',
        frontendUrl: 'https://warehouse.example.com',
      },
    },
  },
};
