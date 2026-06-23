// Default template definitions for starter templates
// These are used for seeding and restoring templates to defaults

export interface DefaultTemplateField {
  fieldName: string;
  fieldType: string;
  isRequired?: boolean;
  defaultValue?: string;
  options?: string[];
  unitType?: string;
  unitOptions?: string[];
  sortOrder: number;
  fieldGroup?: string;
  placeholder?: string;
  helpText?: string;
  prefix?: string;
  suffix?: string;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
}

export interface DefaultTemplate {
  name: string;
  description: string;
  icon: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  fields: DefaultTemplateField[];
  suggests?: string[];
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: 'Power Adapter',
    description: 'AC/DC power adapters and chargers',
    icon: 'mdi:power-plug',
    iconColor: '#fbbf24',
    iconBackgroundColor: '#78350f',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'text', sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model Number', fieldType: 'text', sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Part Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General', helpText: 'OEM or replacement part number' },
      // Electrical Input
      { fieldName: 'Input Voltage', fieldType: 'text', isRequired: true, sortOrder: 10, fieldGroup: 'Input', placeholder: 'e.g., 100-240', suffix: 'VAC' },
      { fieldName: 'Input Frequency', fieldType: 'text', sortOrder: 11, fieldGroup: 'Input', placeholder: 'e.g., 50-60', suffix: 'Hz' },
      { fieldName: 'Input Current', fieldType: 'unit', unitType: 'amperage', unitOptions: ['A', 'mA'], sortOrder: 12, fieldGroup: 'Input' },
      // Electrical Output
      { fieldName: 'Output Voltage', fieldType: 'unit', unitType: 'voltage', unitOptions: ['V', 'VDC'], isRequired: true, sortOrder: 20, fieldGroup: 'Output' },
      { fieldName: 'Output Amperage', fieldType: 'unit', unitType: 'amperage', unitOptions: ['A', 'mA'], isRequired: true, sortOrder: 21, fieldGroup: 'Output' },
      { fieldName: 'Output Wattage', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 22, fieldGroup: 'Output' },
      { fieldName: 'USB-C PD Wattage', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 23, fieldGroup: 'Output', helpText: 'For USB-C Power Delivery adapters' },
      // Connector
      { fieldName: 'Connector Type', fieldType: 'select', options: ['Barrel (DC)', 'USB-A', 'USB-C', 'USB-C PD', 'Micro USB', 'Mini USB', 'Lightning', 'Magnetic', 'Proprietary', 'Other'], sortOrder: 30, fieldGroup: 'Connector' },
      { fieldName: 'Barrel Size', fieldType: 'text', sortOrder: 31, fieldGroup: 'Connector', placeholder: 'e.g., 5.5x2.1mm', helpText: 'Outer x Inner diameter' },
      { fieldName: 'Polarity', fieldType: 'select', options: ['Center Positive', 'Center Negative', 'N/A'], sortOrder: 32, fieldGroup: 'Connector' },
      { fieldName: 'Cable Length', fieldType: 'unit', unitType: 'length', unitOptions: ['ft', 'm', 'in', 'cm'], sortOrder: 33, fieldGroup: 'Connector' },
      { fieldName: 'Cable Detachable', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Connector' },
      // Physical
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Wall Plug', 'Desktop Brick', 'In-Line', 'Multi-Port Hub'], sortOrder: 40, fieldGroup: 'Physical' },
      { fieldName: 'Color', fieldType: 'text', sortOrder: 41, fieldGroup: 'Physical' },
      // Certifications
      { fieldName: 'Efficiency Rating', fieldType: 'select', options: ['Level IV', 'Level V', 'Level VI', '80 PLUS', 'Energy Star', 'Unknown'], sortOrder: 50, fieldGroup: 'Certifications' },
      { fieldName: 'Safety Certifications', fieldType: 'text', sortOrder: 51, fieldGroup: 'Certifications', placeholder: 'e.g., UL, CE, FCC' },
      // Compatibility
      { fieldName: 'Compatible Devices', fieldType: 'text', sortOrder: 60, fieldGroup: 'Compatibility', helpText: 'Devices this adapter works with' }
    ]
  },
  {
    name: 'Router',
    description: 'Network routers and access points',
    icon: 'mdi:router-wireless',
    iconColor: '#60a5fa',
    iconBackgroundColor: '#1e3a8a',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'text', sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'MAC Address (WAN)', fieldType: 'text', sortOrder: 4, fieldGroup: 'General', placeholder: 'AA:BB:CC:DD:EE:FF' },
      // Wireless
      { fieldName: 'WiFi Standard', fieldType: 'select', options: ['WiFi 4 (802.11n)', 'WiFi 5 (802.11ac)', 'WiFi 6 (802.11ax)', 'WiFi 6E', 'WiFi 7 (802.11be)'], sortOrder: 10, fieldGroup: 'Wireless' },
      { fieldName: 'Frequency Bands', fieldType: 'select', options: ['2.4GHz Only', '5GHz Only', 'Dual Band (2.4/5GHz)', 'Tri-Band (2.4/5/5)', 'Tri-Band (2.4/5/6)', 'Quad-Band'], sortOrder: 11, fieldGroup: 'Wireless' },
      { fieldName: 'Speed Rating', fieldType: 'text', sortOrder: 12, fieldGroup: 'Wireless', placeholder: 'e.g., AX3000, AC1750, BE7200' },
      { fieldName: '2.4GHz Speed', fieldType: 'unit', unitType: 'datarate', unitOptions: ['Mbps'], sortOrder: 13, fieldGroup: 'Wireless' },
      { fieldName: '5GHz Speed', fieldType: 'unit', unitType: 'datarate', unitOptions: ['Mbps', 'Gbps'], sortOrder: 14, fieldGroup: 'Wireless' },
      { fieldName: '6GHz Speed', fieldType: 'unit', unitType: 'datarate', unitOptions: ['Mbps', 'Gbps'], sortOrder: 15, fieldGroup: 'Wireless' },
      { fieldName: 'Antenna Count', fieldType: 'number', sortOrder: 16, fieldGroup: 'Wireless', helpText: 'Number of external/internal antennas' },
      { fieldName: 'MU-MIMO', fieldType: 'select', options: ['None', '2x2', '3x3', '4x4', '8x8'], sortOrder: 17, fieldGroup: 'Wireless' },
      { fieldName: 'Mesh Support', fieldType: 'boolean', sortOrder: 18, fieldGroup: 'Wireless' },
      // Ports
      { fieldName: 'WAN Port Speed', fieldType: 'select', options: ['100Mbps', '1Gbps', '2.5Gbps', '10Gbps'], sortOrder: 20, fieldGroup: 'Ports' },
      { fieldName: 'WAN Ports', fieldType: 'number', sortOrder: 21, fieldGroup: 'Ports', minValue: 0, maxValue: 4 },
      { fieldName: 'LAN Port Speed', fieldType: 'select', options: ['100Mbps', '1Gbps', '2.5Gbps', '10Gbps'], sortOrder: 22, fieldGroup: 'Ports' },
      { fieldName: 'LAN Ports', fieldType: 'number', sortOrder: 23, fieldGroup: 'Ports', minValue: 0, maxValue: 8 },
      { fieldName: 'USB Ports', fieldType: 'text', sortOrder: 24, fieldGroup: 'Ports', placeholder: 'e.g., 1x USB 3.0, 1x USB 2.0' },
      { fieldName: 'SFP/SFP+ Ports', fieldType: 'number', sortOrder: 25, fieldGroup: 'Ports', minValue: 0 },
      // Hardware
      { fieldName: 'CPU', fieldType: 'text', sortOrder: 30, fieldGroup: 'Hardware', placeholder: 'e.g., Quad-core 1.8GHz' },
      { fieldName: 'RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['MB', 'GB'], sortOrder: 31, fieldGroup: 'Hardware' },
      { fieldName: 'Flash Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['MB', 'GB'], sortOrder: 32, fieldGroup: 'Hardware' },
      // Management
      { fieldName: 'Management IP', fieldType: 'text', defaultValue: '192.168.1.1', sortOrder: 40, fieldGroup: 'Management' },
      { fieldName: 'Management URL', fieldType: 'url', sortOrder: 41, fieldGroup: 'Management' },
      { fieldName: 'Default Username', fieldType: 'text', sortOrder: 42, fieldGroup: 'Management' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 43, fieldGroup: 'Management' },
      { fieldName: 'Cloud Managed', fieldType: 'boolean', sortOrder: 44, fieldGroup: 'Management' },
      // Features
      { fieldName: 'VPN Server', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Features' },
      { fieldName: 'VPN Client', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Features' },
      { fieldName: 'QoS Support', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Features' },
      { fieldName: 'Parental Controls', fieldType: 'boolean', sortOrder: 53, fieldGroup: 'Features' },
      { fieldName: 'Guest Network', fieldType: 'boolean', sortOrder: 54, fieldGroup: 'Features' },
      // Power
      { fieldName: 'PoE Powered', fieldType: 'boolean', sortOrder: 60, fieldGroup: 'Power', helpText: 'Can be powered via PoE' },
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 61, fieldGroup: 'Power' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Network Switch',
    description: 'Managed and unmanaged network switches',
    icon: 'mdi:ethernet',
    iconColor: '#34d399',
    iconBackgroundColor: '#064e3b',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'text', sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'MAC Address', fieldType: 'text', sortOrder: 4, fieldGroup: 'General', placeholder: 'AA:BB:CC:DD:EE:FF' },
      // Ports
      { fieldName: 'Total Ports', fieldType: 'number', isRequired: true, sortOrder: 10, fieldGroup: 'Ports', minValue: 1, maxValue: 96 },
      { fieldName: 'Port Speed', fieldType: 'select', options: ['100Mbps', '1Gbps', '2.5Gbps', '5Gbps', '10Gbps', '25Gbps', '40Gbps', '100Gbps', 'Mixed'], sortOrder: 11, fieldGroup: 'Ports' },
      { fieldName: 'Uplink Ports', fieldType: 'text', sortOrder: 12, fieldGroup: 'Ports', placeholder: 'e.g., 4x 10G SFP+' },
      { fieldName: 'SFP Ports (1G)', fieldType: 'number', sortOrder: 13, fieldGroup: 'Ports', minValue: 0 },
      { fieldName: 'SFP+ Ports (10G)', fieldType: 'number', sortOrder: 14, fieldGroup: 'Ports', minValue: 0 },
      { fieldName: 'SFP28 Ports (25G)', fieldType: 'number', sortOrder: 15, fieldGroup: 'Ports', minValue: 0 },
      { fieldName: 'QSFP+ Ports (40G)', fieldType: 'number', sortOrder: 16, fieldGroup: 'Ports', minValue: 0 },
      { fieldName: 'QSFP28 Ports (100G)', fieldType: 'number', sortOrder: 17, fieldGroup: 'Ports', minValue: 0 },
      // PoE
      { fieldName: 'PoE Standard', fieldType: 'select', options: ['None', 'PoE (802.3af)', 'PoE+ (802.3at)', 'PoE++ Type 3 (802.3bt)', 'PoE++ Type 4 (802.3bt)', 'Passive PoE'], sortOrder: 20, fieldGroup: 'PoE' },
      { fieldName: 'PoE Budget', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 21, fieldGroup: 'PoE' },
      { fieldName: 'PoE Ports', fieldType: 'number', sortOrder: 22, fieldGroup: 'PoE' },
      { fieldName: 'Max PoE Per Port', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 23, fieldGroup: 'PoE' },
      // Performance
      { fieldName: 'Switching Capacity', fieldType: 'unit', unitType: 'datarate', unitOptions: ['Gbps'], sortOrder: 30, fieldGroup: 'Performance' },
      { fieldName: 'Forwarding Rate', fieldType: 'text', sortOrder: 31, fieldGroup: 'Performance', placeholder: 'e.g., 95.2 Mpps', suffix: 'Mpps' },
      { fieldName: 'MAC Address Table', fieldType: 'number', sortOrder: 32, fieldGroup: 'Performance', suffix: 'entries' },
      { fieldName: 'Jumbo Frame Support', fieldType: 'unit', unitType: 'data', unitOptions: ['KB'], sortOrder: 33, fieldGroup: 'Performance' },
      // Management
      { fieldName: 'Management Type', fieldType: 'select', options: ['Unmanaged', 'Smart/Easy Managed', 'Fully Managed', 'Cloud Managed'], sortOrder: 40, fieldGroup: 'Management' },
      { fieldName: 'Layer', fieldType: 'select', options: ['Layer 2', 'Layer 2+', 'Layer 3'], sortOrder: 41, fieldGroup: 'Management' },
      { fieldName: 'Management IP', fieldType: 'text', sortOrder: 42, fieldGroup: 'Management' },
      { fieldName: 'Management URL', fieldType: 'url', sortOrder: 43, fieldGroup: 'Management' },
      { fieldName: 'CLI Access', fieldType: 'select', options: ['None', 'SSH', 'Telnet', 'SSH + Telnet', 'Console Only'], sortOrder: 44, fieldGroup: 'Management' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 45, fieldGroup: 'Management' },
      // Features
      { fieldName: 'VLAN Support', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Features' },
      { fieldName: 'Max VLANs', fieldType: 'number', sortOrder: 51, fieldGroup: 'Features' },
      { fieldName: 'Link Aggregation', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Features' },
      { fieldName: 'Spanning Tree', fieldType: 'select', options: ['None', 'STP', 'RSTP', 'MSTP'], sortOrder: 53, fieldGroup: 'Features' },
      { fieldName: 'QoS Support', fieldType: 'boolean', sortOrder: 54, fieldGroup: 'Features' },
      { fieldName: 'Port Mirroring', fieldType: 'boolean', sortOrder: 55, fieldGroup: 'Features' },
      { fieldName: 'IGMP Snooping', fieldType: 'boolean', sortOrder: 56, fieldGroup: 'Features' },
      { fieldName: 'Static Routing', fieldType: 'boolean', sortOrder: 57, fieldGroup: 'Features' },
      { fieldName: 'DHCP Server', fieldType: 'boolean', sortOrder: 58, fieldGroup: 'Features' },
      // Physical
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Desktop', 'Rackmount 1U', 'Rackmount 2U', 'DIN Rail'], sortOrder: 60, fieldGroup: 'Physical' },
      { fieldName: 'Fanless', fieldType: 'boolean', sortOrder: 61, fieldGroup: 'Physical' },
      // Power
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 70, fieldGroup: 'Power' },
      { fieldName: 'Redundant Power', fieldType: 'boolean', sortOrder: 71, fieldGroup: 'Power' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Server',
    description: 'Physical servers and compute hardware',
    icon: 'mdi:server',
    iconColor: '#a78bfa',
    iconBackgroundColor: '#4c1d95',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Dell', 'HPE', 'Lenovo', 'Supermicro', 'Cisco', 'Fujitsu', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., PowerEdge R750' },
      { fieldName: 'Service Tag', fieldType: 'text', sortOrder: 3, fieldGroup: 'General', helpText: 'Dell Service Tag, HP Serial, etc.' },
      { fieldName: 'Asset Tag', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Generation', fieldType: 'text', sortOrder: 5, fieldGroup: 'General', placeholder: 'e.g., Gen10, 15G' },
      // CPU
      { fieldName: 'CPU Model', fieldType: 'text', sortOrder: 10, fieldGroup: 'CPU', placeholder: 'e.g., Intel Xeon Gold 6348' },
      { fieldName: 'CPU Sockets', fieldType: 'number', sortOrder: 11, fieldGroup: 'CPU', minValue: 1, maxValue: 8 },
      { fieldName: 'CPUs Installed', fieldType: 'number', sortOrder: 12, fieldGroup: 'CPU', minValue: 1, maxValue: 8 },
      { fieldName: 'Cores Per CPU', fieldType: 'number', sortOrder: 13, fieldGroup: 'CPU' },
      { fieldName: 'Total Cores', fieldType: 'number', sortOrder: 14, fieldGroup: 'CPU' },
      { fieldName: 'Total Threads', fieldType: 'number', sortOrder: 15, fieldGroup: 'CPU' },
      { fieldName: 'CPU Speed', fieldType: 'unit', unitType: 'frequency', unitOptions: ['GHz'], sortOrder: 16, fieldGroup: 'CPU' },
      // Memory
      { fieldName: 'Total RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 20, fieldGroup: 'Memory' },
      { fieldName: 'RAM Type', fieldType: 'select', options: ['DDR4 ECC', 'DDR4 RDIMM', 'DDR4 LRDIMM', 'DDR5 ECC', 'DDR5 RDIMM'], sortOrder: 21, fieldGroup: 'Memory' },
      { fieldName: 'RAM Speed', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MHz'], sortOrder: 22, fieldGroup: 'Memory' },
      { fieldName: 'DIMM Slots Total', fieldType: 'number', sortOrder: 23, fieldGroup: 'Memory' },
      { fieldName: 'DIMM Slots Used', fieldType: 'number', sortOrder: 24, fieldGroup: 'Memory' },
      { fieldName: 'Max RAM Supported', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 25, fieldGroup: 'Memory' },
      // Storage
      { fieldName: 'RAID Controller', fieldType: 'text', sortOrder: 30, fieldGroup: 'Storage', placeholder: 'e.g., PERC H755' },
      { fieldName: 'RAID Level', fieldType: 'select', options: ['None', 'RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10', 'RAID 50', 'RAID 60', 'Mixed'], sortOrder: 31, fieldGroup: 'Storage' },
      { fieldName: 'Drive Bays', fieldType: 'text', sortOrder: 32, fieldGroup: 'Storage', placeholder: 'e.g., 8x 2.5" SAS/SATA' },
      { fieldName: 'Total Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB', 'PB'], sortOrder: 33, fieldGroup: 'Storage' },
      { fieldName: 'Usable Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB', 'PB'], sortOrder: 34, fieldGroup: 'Storage' },
      { fieldName: 'NVMe Bays', fieldType: 'number', sortOrder: 35, fieldGroup: 'Storage', minValue: 0 },
      // Network
      { fieldName: 'Hostname', fieldType: 'text', sortOrder: 40, fieldGroup: 'Network' },
      { fieldName: 'Primary IP', fieldType: 'text', sortOrder: 41, fieldGroup: 'Network' },
      { fieldName: 'Onboard NICs', fieldType: 'text', sortOrder: 42, fieldGroup: 'Network', placeholder: 'e.g., 4x 1GbE' },
      { fieldName: 'Add-in NICs', fieldType: 'text', sortOrder: 43, fieldGroup: 'Network', placeholder: 'e.g., 2x 25GbE SFP28' },
      // Management
      { fieldName: 'BMC Type', fieldType: 'select', options: ['iDRAC', 'iLO', 'IMM', 'IPMI', 'BMC'], sortOrder: 50, fieldGroup: 'Management' },
      { fieldName: 'BMC IP', fieldType: 'text', sortOrder: 51, fieldGroup: 'Management' },
      { fieldName: 'BMC URL', fieldType: 'url', sortOrder: 52, fieldGroup: 'Management' },
      { fieldName: 'BMC Firmware', fieldType: 'text', sortOrder: 53, fieldGroup: 'Management' },
      { fieldName: 'BIOS Version', fieldType: 'text', sortOrder: 54, fieldGroup: 'Management' },
      // Software
      { fieldName: 'OS', fieldType: 'text', sortOrder: 60, fieldGroup: 'Software', placeholder: 'e.g., VMware ESXi 8.0' },
      { fieldName: 'OS Version', fieldType: 'text', sortOrder: 61, fieldGroup: 'Software' },
      { fieldName: 'Hypervisor', fieldType: 'select', options: ['None (Bare Metal)', 'VMware ESXi', 'Hyper-V', 'Proxmox', 'KVM', 'Xen', 'Other'], sortOrder: 62, fieldGroup: 'Software' },
      // Physical
      { fieldName: 'Form Factor', fieldType: 'select', options: ['1U', '2U', '3U', '4U', 'Tower', 'Blade', 'Multi-Node'], sortOrder: 70, fieldGroup: 'Physical' },
      { fieldName: 'Rack Location', fieldType: 'text', sortOrder: 71, fieldGroup: 'Physical', placeholder: 'e.g., Rack 5, U20-21' },
      // Power
      { fieldName: 'Power Supplies', fieldType: 'text', sortOrder: 80, fieldGroup: 'Power', placeholder: 'e.g., 2x 800W' },
      { fieldName: 'Power Redundancy', fieldType: 'select', options: ['None', '1+1', '2+1', '2+2'], sortOrder: 81, fieldGroup: 'Power' },
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 82, fieldGroup: 'Power' },
      // Warranty
      { fieldName: 'Warranty Expires', fieldType: 'date', sortOrder: 90, fieldGroup: 'Warranty' },
      { fieldName: 'Support Level', fieldType: 'text', sortOrder: 91, fieldGroup: 'Warranty', placeholder: 'e.g., ProSupport Plus' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Cable',
    description: 'Network, power, and data cables',
    icon: 'mdi:cable-data',
    iconColor: '#9ca3af',
    iconBackgroundColor: '#1f2937',
    fields: [
      // Type
      { fieldName: 'Cable Type', fieldType: 'select', options: ['Ethernet (Copper)', 'Fiber Optic', 'USB', 'HDMI', 'DisplayPort', 'Thunderbolt', 'Power (IEC)', 'Power (NEMA)', 'Serial/Console', 'SAS/SATA', 'DAC/Twinax', 'Coaxial', 'Audio', 'Other'], isRequired: true, sortOrder: 1, fieldGroup: 'Type' },
      { fieldName: 'Subtype', fieldType: 'text', sortOrder: 2, fieldGroup: 'Type', placeholder: 'e.g., Cat6a, OM4, USB 3.2' },
      // Physical
      { fieldName: 'Length', fieldType: 'unit', unitType: 'length', unitOptions: ['ft', 'm', 'in', 'cm'], sortOrder: 10, fieldGroup: 'Physical' },
      { fieldName: 'Color', fieldType: 'select', options: ['Black', 'White', 'Gray', 'Blue', 'Yellow', 'Orange', 'Green', 'Red', 'Purple', 'Pink', 'Other'], sortOrder: 11, fieldGroup: 'Physical' },
      { fieldName: 'Jacket Material', fieldType: 'select', options: ['PVC', 'LSZH', 'Plenum (CMP)', 'Riser (CMR)', 'Outdoor/Direct Burial'], sortOrder: 12, fieldGroup: 'Physical' },
      // Connectors
      { fieldName: 'Connector A', fieldType: 'select', options: ['RJ45', 'RJ11', 'LC', 'SC', 'ST', 'MTP/MPO', 'USB-A', 'USB-B', 'USB-C', 'Micro USB', 'Mini USB', 'HDMI', 'Mini HDMI', 'Micro HDMI', 'DisplayPort', 'Mini DP', 'SFP', 'SFP+', 'QSFP+', 'C13', 'C14', 'C19', 'C20', '5-15P', '5-15R', 'L6-30P', 'DB9', 'Other'], sortOrder: 20, fieldGroup: 'Connectors' },
      { fieldName: 'Connector B', fieldType: 'select', options: ['RJ45', 'RJ11', 'LC', 'SC', 'ST', 'MTP/MPO', 'USB-A', 'USB-B', 'USB-C', 'Micro USB', 'Mini USB', 'HDMI', 'Mini HDMI', 'Micro HDMI', 'DisplayPort', 'Mini DP', 'SFP', 'SFP+', 'QSFP+', 'C13', 'C14', 'C19', 'C20', '5-15P', '5-15R', 'L6-30P', 'DB9', 'Other'], sortOrder: 21, fieldGroup: 'Connectors' },
      // Ethernet Specs
      { fieldName: 'Category', fieldType: 'select', options: ['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat7a', 'Cat8', 'N/A'], sortOrder: 30, fieldGroup: 'Ethernet' },
      { fieldName: 'Shielding', fieldType: 'select', options: ['UTP (Unshielded)', 'FTP (Foiled)', 'STP (Shielded)', 'SFTP (Shielded Foiled)', 'N/A'], sortOrder: 31, fieldGroup: 'Ethernet' },
      { fieldName: 'AWG', fieldType: 'select', options: ['23 AWG', '24 AWG', '26 AWG', '28 AWG', 'N/A'], sortOrder: 32, fieldGroup: 'Ethernet' },
      { fieldName: 'Bandwidth', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MHz'], sortOrder: 33, fieldGroup: 'Ethernet' },
      // Fiber Specs
      { fieldName: 'Fiber Mode', fieldType: 'select', options: ['Single Mode (OS1)', 'Single Mode (OS2)', 'Multi Mode (OM1)', 'Multi Mode (OM2)', 'Multi Mode (OM3)', 'Multi Mode (OM4)', 'Multi Mode (OM5)', 'N/A'], sortOrder: 40, fieldGroup: 'Fiber' },
      { fieldName: 'Fiber Count', fieldType: 'number', sortOrder: 41, fieldGroup: 'Fiber', helpText: 'Number of fiber strands' },
      { fieldName: 'Polish Type', fieldType: 'select', options: ['UPC', 'APC', 'PC', 'N/A'], sortOrder: 42, fieldGroup: 'Fiber' },
      // USB/Video Specs
      { fieldName: 'USB Version', fieldType: 'select', options: ['USB 2.0', 'USB 3.0', 'USB 3.1', 'USB 3.2', 'USB4', 'N/A'], sortOrder: 50, fieldGroup: 'USB/Video' },
      { fieldName: 'HDMI Version', fieldType: 'select', options: ['HDMI 1.4', 'HDMI 2.0', 'HDMI 2.1', 'N/A'], sortOrder: 51, fieldGroup: 'USB/Video' },
      { fieldName: 'DP Version', fieldType: 'select', options: ['DP 1.2', 'DP 1.4', 'DP 2.0', 'N/A'], sortOrder: 52, fieldGroup: 'USB/Video' },
      { fieldName: 'Max Resolution', fieldType: 'text', sortOrder: 53, fieldGroup: 'USB/Video', placeholder: 'e.g., 4K@60Hz, 8K@30Hz' },
      // Power Specs
      { fieldName: 'Voltage Rating', fieldType: 'unit', unitType: 'voltage', unitOptions: ['V'], sortOrder: 60, fieldGroup: 'Power' },
      { fieldName: 'Amperage Rating', fieldType: 'unit', unitType: 'amperage', unitOptions: ['A'], sortOrder: 61, fieldGroup: 'Power' },
      { fieldName: 'Gauge', fieldType: 'select', options: ['14 AWG', '16 AWG', '18 AWG', 'N/A'], sortOrder: 62, fieldGroup: 'Power' },
      // Performance
      { fieldName: 'Max Speed', fieldType: 'unit', unitType: 'datarate', unitOptions: ['Mbps', 'Gbps'], sortOrder: 70, fieldGroup: 'Performance' },
      // Certifications
      { fieldName: 'Certifications', fieldType: 'text', sortOrder: 80, fieldGroup: 'Certifications', placeholder: 'e.g., ETL, UL Listed' }
    ]
  },
  {
    name: 'Monitor',
    description: 'Computer monitors and displays',
    icon: 'mdi:monitor',
    iconColor: '#f472b6',
    iconBackgroundColor: '#831843',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'text', sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Asset Tag', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      // Display
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['"'], isRequired: true, sortOrder: 10, fieldGroup: 'Display' },
      { fieldName: 'Resolution', fieldType: 'select', options: ['1920x1080 (FHD)', '2560x1440 (QHD)', '3440x1440 (UWQHD)', '3840x2160 (4K)', '5120x1440 (DQHD)', '5120x2160 (5K)', '5120x2880 (5K)', '7680x4320 (8K)', 'Other'], sortOrder: 11, fieldGroup: 'Display' },
      { fieldName: 'Aspect Ratio', fieldType: 'select', options: ['16:9', '16:10', '21:9', '32:9', '32:10', '4:3', '3:2'], sortOrder: 12, fieldGroup: 'Display' },
      { fieldName: 'Panel Type', fieldType: 'select', options: ['IPS', 'VA', 'TN', 'OLED', 'Mini-LED', 'QD-OLED', 'Nano IPS', 'Fast IPS'], sortOrder: 13, fieldGroup: 'Display' },
      { fieldName: 'Backlight', fieldType: 'select', options: ['LED', 'Mini-LED', 'OLED', 'FALD', 'Edge-Lit'], sortOrder: 14, fieldGroup: 'Display' },
      { fieldName: 'Curvature', fieldType: 'select', options: ['Flat', '1000R', '1500R', '1800R', '2300R', '3800R', '4000R'], sortOrder: 15, fieldGroup: 'Display' },
      // Performance
      { fieldName: 'Refresh Rate', fieldType: 'unit', unitType: 'frequency', unitOptions: ['Hz'], sortOrder: 20, fieldGroup: 'Performance' },
      { fieldName: 'Max Refresh Rate', fieldType: 'unit', unitType: 'frequency', unitOptions: ['Hz'], sortOrder: 21, fieldGroup: 'Performance', helpText: 'With overclocking' },
      { fieldName: 'Response Time (GtG)', fieldType: 'unit', unitType: 'time', unitOptions: ['ms'], sortOrder: 22, fieldGroup: 'Performance' },
      { fieldName: 'Variable Refresh', fieldType: 'select', options: ['None', 'FreeSync', 'FreeSync Premium', 'FreeSync Premium Pro', 'G-Sync Compatible', 'G-Sync', 'G-Sync Ultimate', 'Adaptive-Sync'], sortOrder: 23, fieldGroup: 'Performance' },
      // Image Quality
      { fieldName: 'Brightness', fieldType: 'unit', unitType: 'luminosity', unitOptions: ['nit', 'cd/m²'], sortOrder: 30, fieldGroup: 'Image Quality' },
      { fieldName: 'Peak Brightness (HDR)', fieldType: 'unit', unitType: 'luminosity', unitOptions: ['nit'], sortOrder: 31, fieldGroup: 'Image Quality' },
      { fieldName: 'Contrast Ratio', fieldType: 'text', sortOrder: 32, fieldGroup: 'Image Quality', placeholder: 'e.g., 1000:1, 1000000:1 (OLED)' },
      { fieldName: 'Color Gamut', fieldType: 'text', sortOrder: 33, fieldGroup: 'Image Quality', placeholder: 'e.g., 100% sRGB, 98% DCI-P3' },
      { fieldName: 'Color Depth', fieldType: 'select', options: ['8-bit', '8-bit + FRC (10-bit)', '10-bit', '10-bit + FRC (12-bit)', '12-bit'], sortOrder: 34, fieldGroup: 'Image Quality' },
      { fieldName: 'HDR', fieldType: 'select', options: ['None', 'HDR10', 'HDR10+', 'DisplayHDR 400', 'DisplayHDR 600', 'DisplayHDR 1000', 'DisplayHDR 1400', 'DisplayHDR True Black', 'Dolby Vision'], sortOrder: 35, fieldGroup: 'Image Quality' },
      // Connectivity
      { fieldName: 'HDMI Ports', fieldType: 'text', sortOrder: 40, fieldGroup: 'Connectivity', placeholder: 'e.g., 2x HDMI 2.1' },
      { fieldName: 'DisplayPort', fieldType: 'text', sortOrder: 41, fieldGroup: 'Connectivity', placeholder: 'e.g., 1x DP 1.4' },
      { fieldName: 'USB-C (Video)', fieldType: 'text', sortOrder: 42, fieldGroup: 'Connectivity', placeholder: 'e.g., 1x USB-C (DP Alt, 90W PD)' },
      { fieldName: 'USB Hub', fieldType: 'text', sortOrder: 43, fieldGroup: 'Connectivity', placeholder: 'e.g., 4x USB-A 3.0, 1x USB-C' },
      { fieldName: 'Audio Out', fieldType: 'boolean', sortOrder: 44, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 45, fieldGroup: 'Connectivity' },
      // Built-in Features
      { fieldName: 'Speakers', fieldType: 'text', sortOrder: 50, fieldGroup: 'Built-in Features', placeholder: 'e.g., 2x 5W' },
      { fieldName: 'Webcam', fieldType: 'text', sortOrder: 51, fieldGroup: 'Built-in Features', placeholder: 'e.g., 1080p with IR' },
      { fieldName: 'Microphone', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Built-in Features' },
      { fieldName: 'KVM Switch', fieldType: 'boolean', sortOrder: 53, fieldGroup: 'Built-in Features' },
      { fieldName: 'PBP/PIP', fieldType: 'boolean', sortOrder: 54, fieldGroup: 'Built-in Features', helpText: 'Picture-by-Picture / Picture-in-Picture' },
      // Physical
      { fieldName: 'VESA Mount', fieldType: 'select', options: ['75x75', '100x100', '200x100', '200x200', '300x300', 'None'], sortOrder: 60, fieldGroup: 'Physical' },
      { fieldName: 'Stand Adjustments', fieldType: 'text', sortOrder: 61, fieldGroup: 'Physical', placeholder: 'e.g., Tilt, Swivel, Pivot, Height' },
      { fieldName: 'Dimensions', fieldType: 'text', sortOrder: 62, fieldGroup: 'Physical', placeholder: 'WxHxD in mm or inches' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 63, fieldGroup: 'Physical' },
      // Power
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 70, fieldGroup: 'Power' },
      { fieldName: 'Power Delivery', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 71, fieldGroup: 'Power', helpText: 'USB-C power delivery wattage' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'Laptop',
    description: 'Laptops and notebooks',
    icon: 'mdi:laptop',
    iconColor: '#38bdf8',
    iconBackgroundColor: '#0c4a6e',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Dell', 'HP', 'Lenovo', 'Apple', 'ASUS', 'Acer', 'Microsoft', 'MSI', 'Samsung', 'LG', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Asset Tag', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Service Tag', fieldType: 'text', sortOrder: 5, fieldGroup: 'General' },
      // CPU
      { fieldName: 'CPU', fieldType: 'text', sortOrder: 10, fieldGroup: 'CPU', placeholder: 'e.g., Intel Core i7-1365U' },
      { fieldName: 'CPU Generation', fieldType: 'text', sortOrder: 11, fieldGroup: 'CPU', placeholder: 'e.g., 13th Gen, M3' },
      { fieldName: 'Cores/Threads', fieldType: 'text', sortOrder: 12, fieldGroup: 'CPU', placeholder: 'e.g., 10C/12T' },
      // Memory
      { fieldName: 'RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 20, fieldGroup: 'Memory' },
      { fieldName: 'RAM Type', fieldType: 'select', options: ['DDR4', 'DDR5', 'LPDDR4X', 'LPDDR5', 'LPDDR5X', 'Unified (Apple)'], sortOrder: 21, fieldGroup: 'Memory' },
      { fieldName: 'RAM Speed', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MHz'], sortOrder: 22, fieldGroup: 'Memory' },
      { fieldName: 'RAM Upgradeable', fieldType: 'boolean', sortOrder: 23, fieldGroup: 'Memory' },
      { fieldName: 'Max RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 24, fieldGroup: 'Memory' },
      // Storage
      { fieldName: 'Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 30, fieldGroup: 'Storage' },
      { fieldName: 'Storage Type', fieldType: 'select', options: ['NVMe SSD', 'SATA SSD', 'HDD', 'eMMC', 'NVMe + HDD'], sortOrder: 31, fieldGroup: 'Storage' },
      { fieldName: 'Storage Slots', fieldType: 'text', sortOrder: 32, fieldGroup: 'Storage', placeholder: 'e.g., 2x M.2' },
      { fieldName: 'Storage Upgradeable', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Storage' },
      // Graphics
      { fieldName: 'GPU', fieldType: 'text', sortOrder: 40, fieldGroup: 'Graphics', placeholder: 'e.g., NVIDIA RTX 4060' },
      { fieldName: 'GPU Type', fieldType: 'select', options: ['Integrated', 'Dedicated', 'Integrated + Dedicated'], sortOrder: 41, fieldGroup: 'Graphics' },
      { fieldName: 'VRAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 42, fieldGroup: 'Graphics' },
      // Display
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['"'], sortOrder: 50, fieldGroup: 'Display' },
      { fieldName: 'Resolution', fieldType: 'select', options: ['1366x768 (HD)', '1920x1080 (FHD)', '1920x1200 (WUXGA)', '2560x1440 (QHD)', '2560x1600 (WQXGA)', '2880x1800', '3024x1964', '3456x2234', '3840x2160 (4K)', '3840x2400', 'Other'], sortOrder: 51, fieldGroup: 'Display' },
      { fieldName: 'Panel Type', fieldType: 'select', options: ['IPS', 'OLED', 'Mini-LED', 'VA', 'TN'], sortOrder: 52, fieldGroup: 'Display' },
      { fieldName: 'Refresh Rate', fieldType: 'unit', unitType: 'frequency', unitOptions: ['Hz'], sortOrder: 53, fieldGroup: 'Display' },
      { fieldName: 'Touchscreen', fieldType: 'boolean', sortOrder: 54, fieldGroup: 'Display' },
      { fieldName: 'Brightness', fieldType: 'unit', unitType: 'luminosity', unitOptions: ['nit'], sortOrder: 55, fieldGroup: 'Display' },
      // Connectivity
      { fieldName: 'USB-A Ports', fieldType: 'number', sortOrder: 60, fieldGroup: 'Connectivity' },
      { fieldName: 'USB-C/TB Ports', fieldType: 'text', sortOrder: 61, fieldGroup: 'Connectivity', placeholder: 'e.g., 2x USB-C (TB4)' },
      { fieldName: 'HDMI', fieldType: 'select', options: ['None', 'HDMI 1.4', 'HDMI 2.0', 'HDMI 2.1', 'Mini HDMI'], sortOrder: 62, fieldGroup: 'Connectivity' },
      { fieldName: 'SD Card Slot', fieldType: 'select', options: ['None', 'microSD', 'Full SD', 'Full SD (UHS-II)'], sortOrder: 63, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'select', options: ['None', '1GbE', '2.5GbE', 'Via Dongle'], sortOrder: 64, fieldGroup: 'Connectivity' },
      { fieldName: 'Headphone Jack', fieldType: 'boolean', sortOrder: 65, fieldGroup: 'Connectivity' },
      // Wireless
      { fieldName: 'WiFi', fieldType: 'select', options: ['WiFi 5 (802.11ac)', 'WiFi 6 (802.11ax)', 'WiFi 6E', 'WiFi 7'], sortOrder: 70, fieldGroup: 'Wireless' },
      { fieldName: 'Bluetooth', fieldType: 'select', options: ['5.0', '5.1', '5.2', '5.3', '5.4'], sortOrder: 71, fieldGroup: 'Wireless' },
      { fieldName: 'WWAN/LTE', fieldType: 'boolean', sortOrder: 72, fieldGroup: 'Wireless' },
      // Input
      { fieldName: 'Keyboard Layout', fieldType: 'select', options: ['US', 'UK', 'International', 'Other'], sortOrder: 80, fieldGroup: 'Input' },
      { fieldName: 'Keyboard Backlit', fieldType: 'boolean', sortOrder: 81, fieldGroup: 'Input' },
      { fieldName: 'Touchpad Type', fieldType: 'select', options: ['Standard', 'Precision', 'Haptic'], sortOrder: 82, fieldGroup: 'Input' },
      { fieldName: 'Fingerprint Reader', fieldType: 'boolean', sortOrder: 83, fieldGroup: 'Input' },
      // Camera
      { fieldName: 'Webcam', fieldType: 'select', options: ['720p', '1080p', '1080p IR', '5MP', '1080p with Privacy Shutter'], sortOrder: 90, fieldGroup: 'Camera' },
      { fieldName: 'Windows Hello IR', fieldType: 'boolean', sortOrder: 91, fieldGroup: 'Camera' },
      // Software
      { fieldName: 'OS', fieldType: 'text', sortOrder: 100, fieldGroup: 'Software', placeholder: 'e.g., Windows 11 Pro' },
      { fieldName: 'OS License Key', fieldType: 'text', sortOrder: 101, fieldGroup: 'Software' },
      // Battery
      { fieldName: 'Battery Capacity', fieldType: 'unit', unitType: 'power', unitOptions: ['Wh'], sortOrder: 110, fieldGroup: 'Battery' },
      { fieldName: 'Battery Health', fieldType: 'unit', unitType: 'percentage', unitOptions: ['%'], sortOrder: 111, fieldGroup: 'Battery', minValue: 0, maxValue: 100 },
      { fieldName: 'Cycle Count', fieldType: 'number', sortOrder: 112, fieldGroup: 'Battery' },
      { fieldName: 'Charger Wattage', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 113, fieldGroup: 'Battery' },
      // Physical
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 120, fieldGroup: 'Physical' },
      { fieldName: 'Color', fieldType: 'text', sortOrder: 121, fieldGroup: 'Physical' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Desktop Computer',
    description: 'Desktop PCs and workstations',
    icon: 'mdi:desktop-tower',
    iconColor: '#2dd4bf',
    iconBackgroundColor: '#134e4a',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Dell', 'HP', 'Lenovo', 'Apple', 'Custom Build', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Asset Tag', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Service Tag', fieldType: 'text', sortOrder: 5, fieldGroup: 'General' },
      // Physical
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Full Tower', 'Mid Tower', 'Mini Tower', 'SFF', 'USFF', 'Micro', 'Mini PC', 'All-in-One', 'Workstation'], sortOrder: 10, fieldGroup: 'Physical' },
      // CPU
      { fieldName: 'CPU', fieldType: 'text', sortOrder: 20, fieldGroup: 'CPU', placeholder: 'e.g., Intel Core i7-13700' },
      { fieldName: 'CPU Cores/Threads', fieldType: 'text', sortOrder: 21, fieldGroup: 'CPU', placeholder: 'e.g., 16C/24T' },
      // Memory
      { fieldName: 'RAM Installed', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 30, fieldGroup: 'Memory' },
      { fieldName: 'RAM Type', fieldType: 'select', options: ['DDR4', 'DDR5'], sortOrder: 31, fieldGroup: 'Memory' },
      { fieldName: 'RAM Slots', fieldType: 'text', sortOrder: 32, fieldGroup: 'Memory', placeholder: 'e.g., 2/4 used' },
      { fieldName: 'Max RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 33, fieldGroup: 'Memory' },
      // Storage
      { fieldName: 'Primary Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 40, fieldGroup: 'Storage' },
      { fieldName: 'Primary Storage Type', fieldType: 'select', options: ['NVMe SSD', 'SATA SSD', 'HDD'], sortOrder: 41, fieldGroup: 'Storage' },
      { fieldName: 'Secondary Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 42, fieldGroup: 'Storage' },
      { fieldName: 'Drive Bays', fieldType: 'text', sortOrder: 43, fieldGroup: 'Storage', placeholder: 'e.g., 2x 3.5" + 2x 2.5"' },
      // Graphics
      { fieldName: 'GPU', fieldType: 'text', sortOrder: 50, fieldGroup: 'Graphics', placeholder: 'e.g., NVIDIA RTX 4070' },
      { fieldName: 'GPU Type', fieldType: 'select', options: ['Integrated', 'Dedicated', 'Workstation (Quadro/FirePro)'], sortOrder: 51, fieldGroup: 'Graphics' },
      { fieldName: 'VRAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 52, fieldGroup: 'Graphics' },
      // Expansion
      { fieldName: 'PCIe Slots', fieldType: 'text', sortOrder: 60, fieldGroup: 'Expansion', placeholder: 'e.g., 1x x16, 2x x1' },
      { fieldName: 'M.2 Slots', fieldType: 'number', sortOrder: 61, fieldGroup: 'Expansion' },
      // Connectivity
      { fieldName: 'USB Ports', fieldType: 'text', sortOrder: 70, fieldGroup: 'Connectivity', placeholder: 'e.g., 4x USB-A 3.0, 2x USB-C' },
      { fieldName: 'Video Outputs', fieldType: 'text', sortOrder: 71, fieldGroup: 'Connectivity', placeholder: 'e.g., 3x DP, 1x HDMI' },
      { fieldName: 'Ethernet', fieldType: 'select', options: ['1GbE', '2.5GbE', '10GbE', 'Dual 1GbE'], sortOrder: 72, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi/Bluetooth', fieldType: 'boolean', sortOrder: 73, fieldGroup: 'Connectivity' },
      // Network
      { fieldName: 'Hostname', fieldType: 'text', sortOrder: 80, fieldGroup: 'Network' },
      { fieldName: 'IP Address', fieldType: 'text', sortOrder: 81, fieldGroup: 'Network' },
      { fieldName: 'MAC Address', fieldType: 'text', sortOrder: 82, fieldGroup: 'Network' },
      // Software
      { fieldName: 'OS', fieldType: 'text', sortOrder: 90, fieldGroup: 'Software', placeholder: 'e.g., Windows 11 Pro' },
      { fieldName: 'OS License Key', fieldType: 'text', sortOrder: 91, fieldGroup: 'Software' },
      // Power
      { fieldName: 'PSU Wattage', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 100, fieldGroup: 'Power' },
      { fieldName: 'PSU Rating', fieldType: 'select', options: ['80+ White', '80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium', 'Unknown'], sortOrder: 101, fieldGroup: 'Power' }
    ],
    suggests: ['Power Adapter', 'Monitor', 'Cable']
  },
  {
    name: 'UPS',
    description: 'Uninterruptible Power Supplies',
    icon: 'mdi:battery-charging-high',
    iconColor: '#4ade80',
    iconBackgroundColor: '#14532d',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['APC', 'Eaton', 'CyberPower', 'Tripp Lite', 'Vertiv', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      // Capacity
      { fieldName: 'VA Rating', fieldType: 'unit', unitType: 'power', unitOptions: ['VA', 'kVA'], isRequired: true, sortOrder: 10, fieldGroup: 'Capacity' },
      { fieldName: 'Watt Rating', fieldType: 'unit', unitType: 'power', unitOptions: ['W', 'kW'], sortOrder: 11, fieldGroup: 'Capacity' },
      { fieldName: 'Efficiency', fieldType: 'unit', unitType: 'percentage', unitOptions: ['%'], sortOrder: 12, fieldGroup: 'Capacity' },
      // Topology
      { fieldName: 'Topology', fieldType: 'select', options: ['Standby (Offline)', 'Line Interactive', 'Online Double Conversion', 'Line Interactive w/ Pure Sine'], sortOrder: 20, fieldGroup: 'Topology' },
      { fieldName: 'Waveform', fieldType: 'select', options: ['Simulated Sine', 'Stepped Approximation', 'Pure Sine Wave'], sortOrder: 21, fieldGroup: 'Topology' },
      // Input
      { fieldName: 'Input Voltage', fieldType: 'text', sortOrder: 30, fieldGroup: 'Input', placeholder: 'e.g., 120V or 208-240V' },
      { fieldName: 'Input Connection', fieldType: 'text', sortOrder: 31, fieldGroup: 'Input', placeholder: 'e.g., NEMA 5-15P, L6-30P' },
      { fieldName: 'Input Frequency', fieldType: 'text', sortOrder: 32, fieldGroup: 'Input', placeholder: 'e.g., 50/60 Hz' },
      // Output
      { fieldName: 'Output Voltage', fieldType: 'text', sortOrder: 40, fieldGroup: 'Output', placeholder: 'e.g., 120V' },
      { fieldName: 'Total Outlets', fieldType: 'number', sortOrder: 41, fieldGroup: 'Output' },
      { fieldName: 'Battery Backed Outlets', fieldType: 'number', sortOrder: 42, fieldGroup: 'Output' },
      { fieldName: 'Surge Only Outlets', fieldType: 'number', sortOrder: 43, fieldGroup: 'Output' },
      { fieldName: 'Outlet Type', fieldType: 'text', sortOrder: 44, fieldGroup: 'Output', placeholder: 'e.g., NEMA 5-15R, C13, C19' },
      { fieldName: 'Outlet Groups', fieldType: 'number', sortOrder: 45, fieldGroup: 'Output', helpText: 'Switchable outlet groups' },
      // Battery
      { fieldName: 'Battery Type', fieldType: 'text', sortOrder: 50, fieldGroup: 'Battery', placeholder: 'e.g., APCRBC123' },
      { fieldName: 'Battery Count', fieldType: 'number', sortOrder: 51, fieldGroup: 'Battery' },
      { fieldName: 'Battery Install Date', fieldType: 'date', sortOrder: 52, fieldGroup: 'Battery' },
      { fieldName: 'Battery Replace Date', fieldType: 'date', sortOrder: 53, fieldGroup: 'Battery', helpText: 'Recommended replacement date' },
      { fieldName: 'Runtime Full Load', fieldType: 'unit', unitType: 'time', unitOptions: ['min'], sortOrder: 54, fieldGroup: 'Battery' },
      { fieldName: 'Runtime Half Load', fieldType: 'unit', unitType: 'time', unitOptions: ['min'], sortOrder: 55, fieldGroup: 'Battery' },
      { fieldName: 'Hot Swappable', fieldType: 'boolean', sortOrder: 56, fieldGroup: 'Battery' },
      { fieldName: 'External Battery Packs', fieldType: 'number', sortOrder: 57, fieldGroup: 'Battery', minValue: 0 },
      // Management
      { fieldName: 'Management Card', fieldType: 'text', sortOrder: 60, fieldGroup: 'Management', placeholder: 'e.g., AP9631' },
      { fieldName: 'Management IP', fieldType: 'text', sortOrder: 61, fieldGroup: 'Management' },
      { fieldName: 'Management URL', fieldType: 'url', sortOrder: 62, fieldGroup: 'Management' },
      { fieldName: 'SNMP Enabled', fieldType: 'boolean', sortOrder: 63, fieldGroup: 'Management' },
      // Physical
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Tower', 'Rackmount 1U', 'Rackmount 2U', 'Rackmount 3U', 'Rackmount 5U', 'Tower/Rack Convertible'], sortOrder: 70, fieldGroup: 'Physical' },
      { fieldName: 'Rack Location', fieldType: 'text', sortOrder: 71, fieldGroup: 'Physical', placeholder: 'e.g., Rack 3, U1-2' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 72, fieldGroup: 'Physical' },
      // Status
      { fieldName: 'Last Self-Test', fieldType: 'date', sortOrder: 80, fieldGroup: 'Status' },
      { fieldName: 'Current Load', fieldType: 'unit', unitType: 'percentage', unitOptions: ['%'], sortOrder: 81, fieldGroup: 'Status' }
    ]
  },
  {
    name: 'PDU',
    description: 'Power Distribution Units',
    icon: 'mdi:power-socket-us',
    iconColor: '#fb923c',
    iconBackgroundColor: '#7c2d12',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['APC', 'Eaton', 'CyberPower', 'Tripp Lite', 'Vertiv', 'Raritan', 'Server Technology', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Asset Tag', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'PDU Type', fieldType: 'select', options: ['Basic', 'Metered', 'Metered-by-Outlet', 'Monitored', 'Switched', 'Switched Metered', 'Switched Metered-by-Outlet'], isRequired: true, sortOrder: 5, fieldGroup: 'General' },
      // Input - Electrical
      { fieldName: 'Input Voltage', fieldType: 'select', options: ['120V', '208V', '230V', '240V', '400V', '415V', '100-240V'], sortOrder: 10, fieldGroup: 'Input' },
      { fieldName: 'Input Amperage', fieldType: 'unit', unitType: 'amperage', unitOptions: ['A'], sortOrder: 11, fieldGroup: 'Input' },
      { fieldName: 'Input Power', fieldType: 'unit', unitType: 'power', unitOptions: ['kW', 'kVA'], sortOrder: 12, fieldGroup: 'Input' },
      { fieldName: 'Phase', fieldType: 'select', options: ['Single Phase', 'Three Phase (Wye)', 'Three Phase (Delta)'], sortOrder: 13, fieldGroup: 'Input' },
      { fieldName: 'Frequency', fieldType: 'select', options: ['50 Hz', '60 Hz', '50/60 Hz'], sortOrder: 14, fieldGroup: 'Input' },
      { fieldName: 'Input Plug Type', fieldType: 'select', options: ['NEMA 5-15P', 'NEMA 5-20P', 'NEMA L5-20P', 'NEMA L5-30P', 'NEMA L6-20P', 'NEMA L6-30P', 'NEMA L14-30P', 'NEMA L15-30P', 'NEMA L21-30P', 'IEC 60309 16A', 'IEC 60309 32A', 'IEC 60309 63A', 'IEC C20', 'Hardwired', 'Other'], sortOrder: 15, fieldGroup: 'Input' },
      { fieldName: 'Input Cord Length', fieldType: 'unit', unitType: 'length', unitOptions: ['ft', 'm'], sortOrder: 16, fieldGroup: 'Input' },
      { fieldName: 'Breaker Rating', fieldType: 'unit', unitType: 'amperage', unitOptions: ['A'], sortOrder: 17, fieldGroup: 'Input' },
      // Outlets
      { fieldName: 'Total Outlets', fieldType: 'number', sortOrder: 20, fieldGroup: 'Outlets', minValue: 1 },
      { fieldName: 'C13 Outlets', fieldType: 'number', sortOrder: 21, fieldGroup: 'Outlets', minValue: 0 },
      { fieldName: 'C19 Outlets', fieldType: 'number', sortOrder: 22, fieldGroup: 'Outlets', minValue: 0 },
      { fieldName: 'NEMA 5-15R Outlets', fieldType: 'number', sortOrder: 23, fieldGroup: 'Outlets', minValue: 0 },
      { fieldName: 'NEMA 5-20R Outlets', fieldType: 'number', sortOrder: 24, fieldGroup: 'Outlets', minValue: 0 },
      { fieldName: 'NEMA L6-20R Outlets', fieldType: 'number', sortOrder: 25, fieldGroup: 'Outlets', minValue: 0 },
      { fieldName: 'NEMA L6-30R Outlets', fieldType: 'number', sortOrder: 26, fieldGroup: 'Outlets', minValue: 0 },
      { fieldName: 'Outlet Groups', fieldType: 'number', sortOrder: 27, fieldGroup: 'Outlets', helpText: 'Number of independently switchable groups' },
      { fieldName: 'Outlet Orientation', fieldType: 'select', options: ['Front', 'Rear', 'Bilateral (Front & Rear)', 'Alternating'], sortOrder: 28, fieldGroup: 'Outlets' },
      // Metering
      { fieldName: 'Metering Level', fieldType: 'select', options: ['None', 'Inlet Only', 'Per-Phase', 'Per-Breaker', 'Per-Outlet'], sortOrder: 30, fieldGroup: 'Metering' },
      { fieldName: 'Display Type', fieldType: 'select', options: ['None', 'LED Numeric', 'LCD', 'LED Bar Graph', 'Color LCD'], sortOrder: 31, fieldGroup: 'Metering' },
      { fieldName: 'Metrics Available', fieldType: 'text', sortOrder: 32, fieldGroup: 'Metering', placeholder: 'e.g., Amps, Watts, kWh, Volts, PF' },
      // Management
      { fieldName: 'Network Interface', fieldType: 'select', options: ['None', 'Ethernet 10/100', 'Ethernet Gigabit', 'WiFi', 'Serial Only'], sortOrder: 40, fieldGroup: 'Management' },
      { fieldName: 'Management IP', fieldType: 'text', sortOrder: 41, fieldGroup: 'Management' },
      { fieldName: 'Management URL', fieldType: 'url', sortOrder: 42, fieldGroup: 'Management' },
      { fieldName: 'SNMP Enabled', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Management' },
      { fieldName: 'SNMP Version', fieldType: 'select', options: ['v1', 'v2c', 'v3', 'v1/v2c/v3'], sortOrder: 44, fieldGroup: 'Management' },
      { fieldName: 'REST API', fieldType: 'boolean', sortOrder: 45, fieldGroup: 'Management' },
      { fieldName: 'Serial Console', fieldType: 'boolean', sortOrder: 46, fieldGroup: 'Management' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 47, fieldGroup: 'Management' },
      // Environmental
      { fieldName: 'Temp Sensor', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Environmental' },
      { fieldName: 'Humidity Sensor', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Environmental' },
      { fieldName: 'External Sensor Ports', fieldType: 'number', sortOrder: 52, fieldGroup: 'Environmental', minValue: 0 },
      // Physical
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Horizontal 1U', 'Horizontal 2U', 'Vertical 0U (Half Height)', 'Vertical 0U (Full Height)', 'In-Cabinet', 'Tower/Freestanding'], sortOrder: 60, fieldGroup: 'Physical' },
      { fieldName: 'Mounting', fieldType: 'select', options: ['Rack Mount', 'Toolless Mount', 'Button Mount', 'Cage Nut', 'Bolt Mount'], sortOrder: 61, fieldGroup: 'Physical' },
      { fieldName: 'Length/Height', fieldType: 'unit', unitType: 'length', unitOptions: ['in', 'mm', 'U'], sortOrder: 62, fieldGroup: 'Physical' },
      { fieldName: 'Width', fieldType: 'unit', unitType: 'length', unitOptions: ['in', 'mm'], sortOrder: 63, fieldGroup: 'Physical' },
      { fieldName: 'Depth', fieldType: 'unit', unitType: 'length', unitOptions: ['in', 'mm'], sortOrder: 64, fieldGroup: 'Physical' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['lb', 'kg'], sortOrder: 65, fieldGroup: 'Physical' },
      { fieldName: 'Color', fieldType: 'select', options: ['Black', 'White', 'Gray', 'Blue'], sortOrder: 66, fieldGroup: 'Physical' },
      { fieldName: 'Rack Location', fieldType: 'text', sortOrder: 67, fieldGroup: 'Physical', placeholder: 'e.g., Rack 5, Left Rail' },
      // Safety
      { fieldName: 'Certifications', fieldType: 'text', sortOrder: 70, fieldGroup: 'Safety', placeholder: 'e.g., UL, cUL, CE' },
      { fieldName: 'Circuit Breakers', fieldType: 'text', sortOrder: 71, fieldGroup: 'Safety', placeholder: 'e.g., 2x 20A, 1x 30A' }
    ]
  },
  {
    name: 'Hard Drive',
    description: 'Hard drives and SSDs',
    icon: 'mdi:harddisk',
    iconColor: '#818cf8',
    iconBackgroundColor: '#3730a3',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Samsung', 'Western Digital', 'Seagate', 'Crucial', 'Kingston', 'Intel', 'Micron', 'SK Hynix', 'Sabrent', 'HGST', 'Toshiba', 'SanDisk', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Part Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General', placeholder: 'e.g., MZ-V8P1T0B/AM' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 5, fieldGroup: 'General' },
      // Specifications
      { fieldName: 'Drive Type', fieldType: 'select', options: ['HDD', 'SSHD (Hybrid)', 'SSD (SATA)', 'SSD (NVMe)', 'SSD (SAS)', 'SSD (U.2 NVMe)'], isRequired: true, sortOrder: 10, fieldGroup: 'Specifications' },
      { fieldName: 'Capacity', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], isRequired: true, sortOrder: 11, fieldGroup: 'Specifications' },
      { fieldName: 'Usable Capacity', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 12, fieldGroup: 'Specifications', helpText: 'Formatted/usable capacity' },
      { fieldName: 'Interface', fieldType: 'select', options: ['SATA II (3Gbps)', 'SATA III (6Gbps)', 'SAS 6Gbps', 'SAS 12Gbps', 'SAS 24Gbps', 'NVMe PCIe 3.0 x4', 'NVMe PCIe 4.0 x4', 'NVMe PCIe 5.0 x4', 'USB 3.0', 'USB 3.2', 'Thunderbolt'], sortOrder: 13, fieldGroup: 'Specifications' },
      { fieldName: 'NAND Type', fieldType: 'select', options: ['N/A (HDD)', 'SLC', 'MLC', 'TLC', 'QLC', '3D TLC', '3D QLC', 'V-NAND TLC', 'V-NAND QLC'], sortOrder: 14, fieldGroup: 'Specifications', helpText: 'For SSDs only' },
      { fieldName: 'Controller', fieldType: 'text', sortOrder: 15, fieldGroup: 'Specifications', placeholder: 'e.g., Samsung Elpis, Phison E18' },
      { fieldName: 'DRAM Cache', fieldType: 'unit', unitType: 'data', unitOptions: ['MB', 'GB'], sortOrder: 16, fieldGroup: 'Specifications' },
      { fieldName: 'DRAM-less', fieldType: 'boolean', sortOrder: 17, fieldGroup: 'Specifications', helpText: 'HMB (Host Memory Buffer) only' },
      // HDD Specific
      { fieldName: 'RPM', fieldType: 'select', options: ['5400', '5900', '7200', '10000', '15000', 'N/A (SSD)'], sortOrder: 20, fieldGroup: 'HDD', helpText: 'Spindle speed for HDDs' },
      { fieldName: 'Platter Count', fieldType: 'number', sortOrder: 21, fieldGroup: 'HDD', minValue: 1 },
      { fieldName: 'Recording Technology', fieldType: 'select', options: ['CMR (Conventional)', 'SMR (Shingled)', 'HAMR', 'MAMR', 'N/A'], sortOrder: 22, fieldGroup: 'HDD' },
      { fieldName: 'Helium Filled', fieldType: 'boolean', sortOrder: 23, fieldGroup: 'HDD' },
      // Physical
      { fieldName: 'Form Factor', fieldType: 'select', options: ['2.5"', '3.5"', 'M.2 2230', 'M.2 2242', 'M.2 2260', 'M.2 2280', 'M.2 22110', 'U.2 (2.5")', 'U.3', 'mSATA', 'Add-in Card (AIC)', 'EDSFF E1.S', 'EDSFF E1.L', 'EDSFF E3.S'], sortOrder: 30, fieldGroup: 'Physical' },
      { fieldName: 'Height', fieldType: 'select', options: ['5mm', '7mm', '9.5mm', '15mm', '26.1mm (3.5")', 'N/A'], sortOrder: 31, fieldGroup: 'Physical' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['g', 'oz'], sortOrder: 32, fieldGroup: 'Physical' },
      // Performance
      { fieldName: 'Seq Read Speed', fieldType: 'unit', unitType: 'datarate', unitOptions: ['MB/s', 'GB/s'], sortOrder: 40, fieldGroup: 'Performance' },
      { fieldName: 'Seq Write Speed', fieldType: 'unit', unitType: 'datarate', unitOptions: ['MB/s', 'GB/s'], sortOrder: 41, fieldGroup: 'Performance' },
      { fieldName: 'Random Read IOPS', fieldType: 'number', sortOrder: 42, fieldGroup: 'Performance', suffix: 'IOPS', helpText: '4K random read' },
      { fieldName: 'Random Write IOPS', fieldType: 'number', sortOrder: 43, fieldGroup: 'Performance', suffix: 'IOPS', helpText: '4K random write' },
      { fieldName: 'Latency (Read)', fieldType: 'unit', unitType: 'time', unitOptions: ['µs', 'ms'], sortOrder: 44, fieldGroup: 'Performance' },
      { fieldName: 'Latency (Write)', fieldType: 'unit', unitType: 'time', unitOptions: ['µs', 'ms'], sortOrder: 45, fieldGroup: 'Performance' },
      // Endurance & Reliability
      { fieldName: 'TBW Rating', fieldType: 'unit', unitType: 'data', unitOptions: ['TB', 'PB'], sortOrder: 50, fieldGroup: 'Endurance', helpText: 'Total Bytes Written (SSD)' },
      { fieldName: 'DWPD', fieldType: 'number', sortOrder: 51, fieldGroup: 'Endurance', helpText: 'Drive Writes Per Day' },
      { fieldName: 'MTBF', fieldType: 'text', sortOrder: 52, fieldGroup: 'Endurance', placeholder: 'e.g., 1.8M hours' },
      { fieldName: 'AFR', fieldType: 'unit', unitType: 'percentage', unitOptions: ['%'], sortOrder: 53, fieldGroup: 'Endurance', helpText: 'Annualized Failure Rate' },
      { fieldName: 'Warranty', fieldType: 'select', options: ['1 Year', '2 Years', '3 Years', '5 Years', '10 Years', 'Limited Lifetime'], sortOrder: 54, fieldGroup: 'Endurance' },
      // Health & Status
      { fieldName: 'Health Status', fieldType: 'unit', unitType: 'percentage', unitOptions: ['%'], sortOrder: 60, fieldGroup: 'Health', minValue: 0, maxValue: 100 },
      { fieldName: 'Bytes Written', fieldType: 'unit', unitType: 'data', unitOptions: ['TB', 'PB'], sortOrder: 61, fieldGroup: 'Health', helpText: 'Total lifetime writes' },
      { fieldName: 'Power On Hours', fieldType: 'number', sortOrder: 62, fieldGroup: 'Health', suffix: 'hours' },
      { fieldName: 'Power Cycles', fieldType: 'number', sortOrder: 63, fieldGroup: 'Health' },
      { fieldName: 'Temperature', fieldType: 'unit', unitType: 'temperature', unitOptions: ['°C', '°F'], sortOrder: 64, fieldGroup: 'Health' },
      { fieldName: 'Reallocated Sectors', fieldType: 'number', sortOrder: 65, fieldGroup: 'Health' },
      // Power
      { fieldName: 'Active Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 70, fieldGroup: 'Power' },
      { fieldName: 'Idle Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 71, fieldGroup: 'Power' },
      { fieldName: 'Power Loss Protection', fieldType: 'boolean', sortOrder: 72, fieldGroup: 'Power', helpText: 'Capacitor-backed PLP' },
      // Security
      { fieldName: 'Encryption', fieldType: 'select', options: ['None', 'AES-128', 'AES-256', 'TCG Opal 2.0', 'eDrive (BitLocker)', 'FIPS 140-2', 'FIPS 140-3'], sortOrder: 80, fieldGroup: 'Security' },
      { fieldName: 'Secure Erase', fieldType: 'boolean', sortOrder: 81, fieldGroup: 'Security' },
      // Enterprise Features
      { fieldName: 'Enterprise Class', fieldType: 'boolean', sortOrder: 90, fieldGroup: 'Enterprise' },
      { fieldName: 'Dual Port', fieldType: 'boolean', sortOrder: 91, fieldGroup: 'Enterprise', helpText: 'SAS dual-port for HA' },
      { fieldName: 'T10 DIF', fieldType: 'boolean', sortOrder: 92, fieldGroup: 'Enterprise', helpText: 'Data Integrity Field' }
    ]
  },
  {
    name: 'RAM Module',
    description: 'Memory modules (DIMM/SODIMM)',
    icon: 'mdi:memory',
    iconColor: '#c084fc',
    iconBackgroundColor: '#581c87',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'Samsung', 'SK Hynix', 'Micron', 'TeamGroup', 'Patriot', 'ADATA', 'PNY', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model/Series', fieldType: 'text', sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., Vengeance LPX, Trident Z5' },
      { fieldName: 'Part Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General', placeholder: 'e.g., CMK32GX5M2B5600C36' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      // Specifications
      { fieldName: 'Memory Type', fieldType: 'select', options: ['DDR3', 'DDR4', 'DDR5', 'DDR3 ECC', 'DDR4 ECC', 'DDR5 ECC', 'DDR4 ECC RDIMM', 'DDR5 ECC RDIMM', 'LPDDR4X', 'LPDDR5', 'LPDDR5X'], isRequired: true, sortOrder: 10, fieldGroup: 'Specifications' },
      { fieldName: 'Capacity', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], isRequired: true, sortOrder: 11, fieldGroup: 'Specifications' },
      { fieldName: 'Speed (MT/s)', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MT/s', 'MHz'], sortOrder: 12, fieldGroup: 'Specifications', helpText: 'Data rate (MT/s for DDR5, MHz commonly used for DDR4)' },
      { fieldName: 'Base Speed', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MT/s', 'MHz'], sortOrder: 13, fieldGroup: 'Specifications', helpText: 'JEDEC standard speed' },
      { fieldName: 'Voltage', fieldType: 'unit', unitType: 'voltage', unitOptions: ['V'], sortOrder: 14, fieldGroup: 'Specifications' },
      { fieldName: 'Rank', fieldType: 'select', options: ['Single Rank (1Rx8)', 'Single Rank (1Rx16)', 'Dual Rank (2Rx8)', 'Quad Rank (4Rx4)', 'Octa Rank'], sortOrder: 15, fieldGroup: 'Specifications' },
      { fieldName: 'Die Type', fieldType: 'text', sortOrder: 16, fieldGroup: 'Specifications', placeholder: 'e.g., Samsung B-die, Hynix A-die' },
      { fieldName: 'On-Die ECC', fieldType: 'boolean', sortOrder: 17, fieldGroup: 'Specifications', helpText: 'DDR5 on-die error correction' },
      // Timings
      { fieldName: 'CAS Latency (CL)', fieldType: 'number', sortOrder: 20, fieldGroup: 'Timings' },
      { fieldName: 'tRCD', fieldType: 'number', sortOrder: 21, fieldGroup: 'Timings' },
      { fieldName: 'tRP', fieldType: 'number', sortOrder: 22, fieldGroup: 'Timings' },
      { fieldName: 'tRAS', fieldType: 'number', sortOrder: 23, fieldGroup: 'Timings' },
      { fieldName: 'Full Timings', fieldType: 'text', sortOrder: 24, fieldGroup: 'Timings', placeholder: 'e.g., 36-36-36-76 or 16-18-18-38' },
      { fieldName: 'True Latency (ns)', fieldType: 'number', sortOrder: 25, fieldGroup: 'Timings', helpText: 'CL / (Speed / 2000)' },
      // XMP/EXPO
      { fieldName: 'XMP/EXPO Support', fieldType: 'select', options: ['None', 'XMP 2.0', 'XMP 3.0', 'AMD EXPO', 'XMP 3.0 + EXPO'], sortOrder: 30, fieldGroup: 'Profiles' },
      { fieldName: 'XMP Profile 1', fieldType: 'text', sortOrder: 31, fieldGroup: 'Profiles', placeholder: 'e.g., 5600 MT/s CL36 @ 1.25V' },
      { fieldName: 'XMP Profile 2', fieldType: 'text', sortOrder: 32, fieldGroup: 'Profiles', placeholder: 'e.g., 5200 MT/s CL34 @ 1.20V' },
      { fieldName: 'EXPO Profile', fieldType: 'text', sortOrder: 33, fieldGroup: 'Profiles', placeholder: 'AMD EXPO profile specs' },
      // Physical
      { fieldName: 'Form Factor', fieldType: 'select', options: ['UDIMM', 'SODIMM', 'RDIMM (Registered)', 'LRDIMM (Load Reduced)', 'CUDIMM (Clocked)', 'CSODIMM'], sortOrder: 40, fieldGroup: 'Physical' },
      { fieldName: 'Module Height', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 41, fieldGroup: 'Physical' },
      { fieldName: 'Heat Spreader', fieldType: 'select', options: ['None', 'Low Profile Aluminum', 'Standard Aluminum', 'Premium Metal', 'RGB with Heatsink'], sortOrder: 42, fieldGroup: 'Physical' },
      { fieldName: 'Color', fieldType: 'text', sortOrder: 43, fieldGroup: 'Physical', placeholder: 'e.g., Black, White, Silver' },
      { fieldName: 'RGB Lighting', fieldType: 'select', options: ['None', 'RGB', 'Addressable RGB', 'iCUE', 'Aura Sync', 'Mystic Light', 'Multiple Ecosystems'], sortOrder: 44, fieldGroup: 'Physical' },
      // Kit Information
      { fieldName: 'Kit Type', fieldType: 'select', options: ['Single Module', '2-Module Kit', '4-Module Kit', '8-Module Kit'], sortOrder: 50, fieldGroup: 'Kit' },
      { fieldName: 'Kit Total Capacity', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 51, fieldGroup: 'Kit', helpText: 'Total capacity of the kit' },
      { fieldName: 'Modules in Kit', fieldType: 'number', sortOrder: 52, fieldGroup: 'Kit', minValue: 1 },
      // Compatibility
      { fieldName: 'Platform', fieldType: 'select', options: ['Intel', 'AMD', 'Intel + AMD', 'Apple Silicon', 'Server/Workstation'], sortOrder: 60, fieldGroup: 'Compatibility' },
      { fieldName: 'Tested Platforms', fieldType: 'text', sortOrder: 61, fieldGroup: 'Compatibility', placeholder: 'e.g., Intel Z790, AMD X670E' },
      { fieldName: 'QVL Listed', fieldType: 'boolean', sortOrder: 62, fieldGroup: 'Compatibility', helpText: 'On motherboard QVL' },
      // Status
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Tested Good', 'Untested', 'Faulty', 'RMA'], sortOrder: 70, fieldGroup: 'Status' },
      { fieldName: 'Installed In', fieldType: 'text', sortOrder: 71, fieldGroup: 'Status', helpText: 'System this module is installed in' },
      { fieldName: 'DIMM Slot', fieldType: 'text', sortOrder: 72, fieldGroup: 'Status', placeholder: 'e.g., A1, B2' },
      // Warranty
      { fieldName: 'Warranty', fieldType: 'select', options: ['Limited Lifetime', '10 Years', '5 Years', '3 Years', 'Expired'], sortOrder: 80, fieldGroup: 'Warranty' },
      { fieldName: 'Purchase Date', fieldType: 'date', sortOrder: 81, fieldGroup: 'Warranty' }
    ]
  },
  {
    name: 'Motherboard',
    description: 'Desktop and server motherboards',
    icon: 'mdi:developer-board',
    iconColor: '#22c55e',
    iconBackgroundColor: '#14532d',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'EVGA', 'NZXT', 'Biostar', 'Supermicro', 'Intel', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., ROG STRIX Z790-E' },
      { fieldName: 'Product Line', fieldType: 'text', sortOrder: 3, fieldGroup: 'General', placeholder: 'e.g., ROG STRIX, MAG, AORUS' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Revision', fieldType: 'text', sortOrder: 5, fieldGroup: 'General', placeholder: 'e.g., Rev 1.0' },
      // Platform
      { fieldName: 'Socket', fieldType: 'select', options: ['LGA 1700', 'LGA 1200', 'LGA 1151', 'LGA 2066', 'LGA 4677', 'AM5', 'AM4', 'sTRX4', 'sWRX8', 'SP5', 'Other'], isRequired: true, sortOrder: 10, fieldGroup: 'Platform' },
      { fieldName: 'Chipset', fieldType: 'select', options: ['Intel Z790', 'Intel Z690', 'Intel B760', 'Intel B660', 'Intel H770', 'Intel H670', 'Intel W790', 'Intel W680', 'Intel X299', 'AMD X670E', 'AMD X670', 'AMD B650E', 'AMD B650', 'AMD A620', 'AMD X570', 'AMD B550', 'AMD TRX50', 'AMD WRX90', 'Other'], sortOrder: 11, fieldGroup: 'Platform' },
      { fieldName: 'Platform', fieldType: 'select', options: ['Intel Desktop', 'Intel HEDT', 'Intel Workstation', 'AMD Desktop', 'AMD HEDT', 'AMD Workstation', 'Server'], sortOrder: 12, fieldGroup: 'Platform' },
      { fieldName: 'Supported CPUs', fieldType: 'text', sortOrder: 13, fieldGroup: 'Platform', placeholder: 'e.g., 12th/13th/14th Gen Core' },
      // Form Factor
      { fieldName: 'Form Factor', fieldType: 'select', options: ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX', 'Mini-DTX', 'SSI-CEB', 'SSI-EEB'], isRequired: true, sortOrder: 20, fieldGroup: 'Form Factor' },
      { fieldName: 'Dimensions', fieldType: 'text', sortOrder: 21, fieldGroup: 'Form Factor', placeholder: 'e.g., 305 x 244 mm' },
      { fieldName: 'Mounting Holes', fieldType: 'text', sortOrder: 22, fieldGroup: 'Form Factor', placeholder: 'e.g., ATX standard 9-hole' },
      // Memory
      { fieldName: 'Memory Type', fieldType: 'select', options: ['DDR5', 'DDR4', 'DDR5 ECC', 'DDR4 ECC', 'DDR5 RDIMM', 'DDR4 RDIMM'], sortOrder: 30, fieldGroup: 'Memory' },
      { fieldName: 'Memory Slots', fieldType: 'number', sortOrder: 31, fieldGroup: 'Memory', minValue: 1, maxValue: 16 },
      { fieldName: 'Max Memory', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 32, fieldGroup: 'Memory' },
      { fieldName: 'Max Memory Speed', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MT/s', 'MHz'], sortOrder: 33, fieldGroup: 'Memory', helpText: 'With XMP/EXPO' },
      { fieldName: 'Memory Channels', fieldType: 'select', options: ['Dual Channel', 'Quad Channel', 'Octa Channel'], sortOrder: 34, fieldGroup: 'Memory' },
      { fieldName: 'ECC Support', fieldType: 'boolean', sortOrder: 35, fieldGroup: 'Memory' },
      // Expansion Slots
      { fieldName: 'PCIe x16 Slots', fieldType: 'text', sortOrder: 40, fieldGroup: 'Expansion', placeholder: 'e.g., 2x PCIe 5.0 x16, 1x PCIe 4.0 x16' },
      { fieldName: 'PCIe x4 Slots', fieldType: 'number', sortOrder: 41, fieldGroup: 'Expansion', minValue: 0 },
      { fieldName: 'PCIe x1 Slots', fieldType: 'number', sortOrder: 42, fieldGroup: 'Expansion', minValue: 0 },
      { fieldName: 'PCIe Generation', fieldType: 'select', options: ['PCIe 5.0', 'PCIe 4.0', 'PCIe 3.0', 'Mixed'], sortOrder: 43, fieldGroup: 'Expansion' },
      { fieldName: 'SLI/CrossFire', fieldType: 'select', options: ['None', 'NVIDIA SLI', 'AMD CrossFire', 'Both'], sortOrder: 44, fieldGroup: 'Expansion' },
      // Storage
      { fieldName: 'M.2 Slots', fieldType: 'text', sortOrder: 50, fieldGroup: 'Storage', placeholder: 'e.g., 4x M.2 (3x PCIe 5.0, 1x PCIe 4.0)' },
      { fieldName: 'SATA Ports', fieldType: 'number', sortOrder: 51, fieldGroup: 'Storage', minValue: 0 },
      { fieldName: 'SATA Version', fieldType: 'select', options: ['SATA III (6Gbps)', 'SATA II (3Gbps)'], sortOrder: 52, fieldGroup: 'Storage' },
      { fieldName: 'U.2 Ports', fieldType: 'number', sortOrder: 53, fieldGroup: 'Storage', minValue: 0 },
      { fieldName: 'RAID Support', fieldType: 'text', sortOrder: 54, fieldGroup: 'Storage', placeholder: 'e.g., 0, 1, 5, 10' },
      // Networking
      { fieldName: 'Ethernet', fieldType: 'text', sortOrder: 60, fieldGroup: 'Network', placeholder: 'e.g., Intel 2.5GbE + Realtek 1GbE' },
      { fieldName: 'WiFi', fieldType: 'text', sortOrder: 61, fieldGroup: 'Network', placeholder: 'e.g., Intel WiFi 6E AX211' },
      { fieldName: 'Bluetooth', fieldType: 'text', sortOrder: 62, fieldGroup: 'Network', placeholder: 'e.g., Bluetooth 5.3' },
      // USB & I/O
      { fieldName: 'Rear USB Ports', fieldType: 'text', sortOrder: 70, fieldGroup: 'USB', placeholder: 'e.g., 1x USB-C 3.2 G2x2, 4x USB-A 3.2 G2' },
      { fieldName: 'USB Headers', fieldType: 'text', sortOrder: 71, fieldGroup: 'USB', placeholder: 'e.g., 1x USB-C, 2x USB 3.0, 2x USB 2.0' },
      { fieldName: 'Thunderbolt', fieldType: 'text', sortOrder: 72, fieldGroup: 'USB', placeholder: 'e.g., Thunderbolt 4 header' },
      // Audio
      { fieldName: 'Audio Codec', fieldType: 'text', sortOrder: 80, fieldGroup: 'Audio', placeholder: 'e.g., Realtek ALC4080' },
      { fieldName: 'Audio Channels', fieldType: 'select', options: ['7.1', '5.1', '2.1', 'Stereo'], sortOrder: 81, fieldGroup: 'Audio' },
      { fieldName: 'S/PDIF', fieldType: 'boolean', sortOrder: 82, fieldGroup: 'Audio' },
      // Video Output
      { fieldName: 'Video Outputs', fieldType: 'text', sortOrder: 90, fieldGroup: 'Video', placeholder: 'e.g., 1x HDMI 2.1, 1x DP 1.4', helpText: 'For integrated graphics' },
      // Power
      { fieldName: 'CPU Power', fieldType: 'text', sortOrder: 100, fieldGroup: 'Power', placeholder: 'e.g., 16+1+2 phase, 90A MOSFETs' },
      { fieldName: 'CPU Power Connector', fieldType: 'text', sortOrder: 101, fieldGroup: 'Power', placeholder: 'e.g., 8+8 pin' },
      { fieldName: 'ATX Power Connector', fieldType: 'select', options: ['24-pin ATX', '24-pin ATX + 12VHPWR', '24-pin + 8-pin EPS'], sortOrder: 102, fieldGroup: 'Power' },
      // Features
      { fieldName: 'BIOS Type', fieldType: 'select', options: ['UEFI', 'UEFI AMI', 'UEFI Award'], sortOrder: 110, fieldGroup: 'Features' },
      { fieldName: 'BIOS Version', fieldType: 'text', sortOrder: 111, fieldGroup: 'Features' },
      { fieldName: 'Q-Flash/BIOS Flashback', fieldType: 'boolean', sortOrder: 112, fieldGroup: 'Features' },
      { fieldName: 'Clear CMOS Button', fieldType: 'boolean', sortOrder: 113, fieldGroup: 'Features' },
      { fieldName: 'Debug LED/Display', fieldType: 'select', options: ['None', 'Q-LED', 'Debug Code Display', 'Both'], sortOrder: 114, fieldGroup: 'Features' },
      { fieldName: 'RGB Headers', fieldType: 'text', sortOrder: 115, fieldGroup: 'Features', placeholder: 'e.g., 2x RGB, 3x ARGB' },
      { fieldName: 'Fan Headers', fieldType: 'number', sortOrder: 116, fieldGroup: 'Features' },
      // Cooling
      { fieldName: 'VRM Heatsink', fieldType: 'boolean', sortOrder: 120, fieldGroup: 'Cooling' },
      { fieldName: 'M.2 Heatsinks', fieldType: 'number', sortOrder: 121, fieldGroup: 'Cooling', helpText: 'Number of M.2 slots with heatsinks' },
      { fieldName: 'Chipset Heatsink', fieldType: 'boolean', sortOrder: 122, fieldGroup: 'Cooling' },
      // Status
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Tested Good', 'Untested', 'Faulty', 'For Parts'], sortOrder: 130, fieldGroup: 'Status' },
      { fieldName: 'Installed In', fieldType: 'text', sortOrder: 131, fieldGroup: 'Status' },
      // Included
      { fieldName: 'Included Accessories', fieldType: 'text', sortOrder: 140, fieldGroup: 'Included', placeholder: 'e.g., I/O Shield, SATA cables, WiFi antenna' }
    ],
    suggests: ['RAM Module', 'Hard Drive', 'Power Adapter']
  },
  {
    name: 'Graphics Card',
    description: 'Dedicated graphics cards (GPUs)',
    icon: 'mdi:expansion-card',
    iconColor: '#ef4444',
    iconBackgroundColor: '#7f1d1d',
    fields: [
      // General
      { fieldName: 'Brand', fieldType: 'select', options: ['ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Zotac', 'PNY', 'Sapphire', 'XFX', 'PowerColor', 'ASRock', 'Palit', 'Gainward', 'Inno3D', 'Founders Edition', 'Reference', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model Line', fieldType: 'text', sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., ROG STRIX, SUPRIM X, AORUS Master' },
      { fieldName: 'GPU Chip', fieldType: 'select', options: ['RTX 5090', 'RTX 5080', 'RTX 5070 Ti', 'RTX 5070', 'RTX 4090', 'RTX 4080 SUPER', 'RTX 4080', 'RTX 4070 Ti SUPER', 'RTX 4070 Ti', 'RTX 4070 SUPER', 'RTX 4070', 'RTX 4060 Ti', 'RTX 4060', 'RTX 3090 Ti', 'RTX 3090', 'RTX 3080 Ti', 'RTX 3080', 'RTX 3070 Ti', 'RTX 3070', 'RTX 3060 Ti', 'RTX 3060', 'RX 9070 XT', 'RX 9070', 'RX 7900 XTX', 'RX 7900 XT', 'RX 7900 GRE', 'RX 7800 XT', 'RX 7700 XT', 'RX 7600 XT', 'RX 7600', 'RX 6950 XT', 'RX 6900 XT', 'RX 6800 XT', 'RX 6800', 'RX 6750 XT', 'RX 6700 XT', 'RX 6650 XT', 'RX 6600 XT', 'RX 6600', 'Arc A770', 'Arc A750', 'Arc A580', 'Quadro/RTX Pro', 'Other'], isRequired: true, sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'GPU Manufacturer', fieldType: 'select', options: ['NVIDIA', 'AMD', 'Intel'], sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 5, fieldGroup: 'General' },
      // GPU Specs
      { fieldName: 'Architecture', fieldType: 'text', sortOrder: 10, fieldGroup: 'GPU Specs', placeholder: 'e.g., Ada Lovelace, RDNA 3, Blackwell' },
      { fieldName: 'Process Node', fieldType: 'text', sortOrder: 11, fieldGroup: 'GPU Specs', placeholder: 'e.g., TSMC 4nm' },
      { fieldName: 'CUDA/Stream Cores', fieldType: 'number', sortOrder: 12, fieldGroup: 'GPU Specs' },
      { fieldName: 'RT Cores', fieldType: 'number', sortOrder: 13, fieldGroup: 'GPU Specs', helpText: 'Ray Tracing cores (NVIDIA)' },
      { fieldName: 'Tensor/AI Cores', fieldType: 'number', sortOrder: 14, fieldGroup: 'GPU Specs' },
      { fieldName: 'TMUs', fieldType: 'number', sortOrder: 15, fieldGroup: 'GPU Specs', helpText: 'Texture Mapping Units' },
      { fieldName: 'ROPs', fieldType: 'number', sortOrder: 16, fieldGroup: 'GPU Specs', helpText: 'Render Output Units' },
      // Clocks
      { fieldName: 'Base Clock', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MHz', 'GHz'], sortOrder: 20, fieldGroup: 'Clocks' },
      { fieldName: 'Boost Clock', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MHz', 'GHz'], sortOrder: 21, fieldGroup: 'Clocks' },
      { fieldName: 'OC Clock', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MHz', 'GHz'], sortOrder: 22, fieldGroup: 'Clocks', helpText: 'Factory overclock boost' },
      { fieldName: 'Memory Clock', fieldType: 'unit', unitType: 'frequency', unitOptions: ['MHz', 'Gbps'], sortOrder: 23, fieldGroup: 'Clocks' },
      // Memory
      { fieldName: 'VRAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], isRequired: true, sortOrder: 30, fieldGroup: 'Memory' },
      { fieldName: 'Memory Type', fieldType: 'select', options: ['GDDR7', 'GDDR6X', 'GDDR6', 'GDDR5X', 'GDDR5', 'HBM3', 'HBM2e', 'HBM2'], sortOrder: 31, fieldGroup: 'Memory' },
      { fieldName: 'Memory Bus', fieldType: 'select', options: ['512-bit', '384-bit', '320-bit', '256-bit', '192-bit', '128-bit', '96-bit', '64-bit'], sortOrder: 32, fieldGroup: 'Memory' },
      { fieldName: 'Memory Bandwidth', fieldType: 'unit', unitType: 'datarate', unitOptions: ['GB/s', 'TB/s'], sortOrder: 33, fieldGroup: 'Memory' },
      // Performance
      { fieldName: 'TFLOPs (FP32)', fieldType: 'number', sortOrder: 40, fieldGroup: 'Performance', helpText: 'Single precision compute' },
      { fieldName: 'TFLOPs (FP16)', fieldType: 'number', sortOrder: 41, fieldGroup: 'Performance', helpText: 'Half precision compute' },
      // Display Outputs
      { fieldName: 'HDMI Ports', fieldType: 'text', sortOrder: 50, fieldGroup: 'Display', placeholder: 'e.g., 2x HDMI 2.1a' },
      { fieldName: 'DisplayPort', fieldType: 'text', sortOrder: 51, fieldGroup: 'Display', placeholder: 'e.g., 3x DP 2.1' },
      { fieldName: 'USB-C/VirtualLink', fieldType: 'text', sortOrder: 52, fieldGroup: 'Display', placeholder: 'e.g., 1x USB-C' },
      { fieldName: 'Max Resolution', fieldType: 'text', sortOrder: 53, fieldGroup: 'Display', placeholder: 'e.g., 7680x4320 (8K)' },
      { fieldName: 'Max Displays', fieldType: 'number', sortOrder: 54, fieldGroup: 'Display' },
      // Power
      { fieldName: 'TDP/TBP', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 60, fieldGroup: 'Power' },
      { fieldName: 'Total Board Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 61, fieldGroup: 'Power' },
      { fieldName: 'Power Connectors', fieldType: 'text', sortOrder: 62, fieldGroup: 'Power', placeholder: 'e.g., 1x 16-pin 12VHPWR or 3x 8-pin' },
      { fieldName: 'Recommended PSU', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 63, fieldGroup: 'Power' },
      // Cooling
      { fieldName: 'Cooling Type', fieldType: 'select', options: ['Triple Fan', 'Dual Fan', 'Single Fan', 'Blower', 'Liquid Cooled', 'Hybrid', 'Passive'], sortOrder: 70, fieldGroup: 'Cooling' },
      { fieldName: 'Cooler Design', fieldType: 'text', sortOrder: 71, fieldGroup: 'Cooling', placeholder: 'e.g., Vapor Chamber, Direct Touch' },
      { fieldName: 'Fan Size', fieldType: 'text', sortOrder: 72, fieldGroup: 'Cooling', placeholder: 'e.g., 3x 100mm' },
      { fieldName: '0dB Mode', fieldType: 'boolean', sortOrder: 73, fieldGroup: 'Cooling', helpText: 'Fans stop at idle' },
      // Physical
      { fieldName: 'Card Length', fieldType: 'unit', unitType: 'length', unitOptions: ['mm', 'in'], sortOrder: 80, fieldGroup: 'Physical' },
      { fieldName: 'Card Height', fieldType: 'unit', unitType: 'length', unitOptions: ['mm', 'in'], sortOrder: 81, fieldGroup: 'Physical' },
      { fieldName: 'Card Thickness', fieldType: 'text', sortOrder: 82, fieldGroup: 'Physical', placeholder: 'e.g., 2.5-slot, 3-slot' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['g', 'kg', 'lb'], sortOrder: 83, fieldGroup: 'Physical' },
      { fieldName: 'Backplate', fieldType: 'boolean', sortOrder: 84, fieldGroup: 'Physical' },
      { fieldName: 'RGB Lighting', fieldType: 'select', options: ['None', 'RGB', 'ARGB', 'Aura Sync', 'Mystic Light', 'RGB Fusion', 'Multiple'], sortOrder: 85, fieldGroup: 'Physical' },
      // Features
      { fieldName: 'DLSS Version', fieldType: 'select', options: ['N/A', 'DLSS 2', 'DLSS 3', 'DLSS 3.5', 'DLSS 4'], sortOrder: 90, fieldGroup: 'Features', helpText: 'NVIDIA only' },
      { fieldName: 'FSR Support', fieldType: 'boolean', sortOrder: 91, fieldGroup: 'Features', helpText: 'AMD FidelityFX' },
      { fieldName: 'Ray Tracing', fieldType: 'boolean', sortOrder: 92, fieldGroup: 'Features' },
      { fieldName: 'NVENC/VCE Gen', fieldType: 'text', sortOrder: 93, fieldGroup: 'Features', placeholder: 'e.g., NVENC 9th Gen, VCE 4.0' },
      { fieldName: 'DirectX Version', fieldType: 'select', options: ['DirectX 12 Ultimate', 'DirectX 12', 'DirectX 11'], sortOrder: 94, fieldGroup: 'Features' },
      { fieldName: 'Vulkan Version', fieldType: 'text', sortOrder: 95, fieldGroup: 'Features' },
      { fieldName: 'OpenGL Version', fieldType: 'text', sortOrder: 96, fieldGroup: 'Features' },
      // Driver/Software
      { fieldName: 'Driver Version', fieldType: 'text', sortOrder: 100, fieldGroup: 'Software' },
      { fieldName: 'VBIOS Version', fieldType: 'text', sortOrder: 101, fieldGroup: 'Software' },
      // Status
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Tested Good', 'Untested', 'Artifacts', 'No Display', 'Fan Issue', 'For Parts'], sortOrder: 110, fieldGroup: 'Status' },
      { fieldName: 'Mining History', fieldType: 'select', options: ['No', 'Unknown', 'Yes - Light Use', 'Yes - Heavy Use'], sortOrder: 111, fieldGroup: 'Status' },
      { fieldName: 'Installed In', fieldType: 'text', sortOrder: 112, fieldGroup: 'Status' },
      // Warranty
      { fieldName: 'Warranty', fieldType: 'select', options: ['Active', '1 Year', '2 Years', '3 Years', '4 Years', 'Expired', 'Unknown'], sortOrder: 120, fieldGroup: 'Warranty' },
      { fieldName: 'Purchase Date', fieldType: 'date', sortOrder: 121, fieldGroup: 'Warranty' },
      { fieldName: 'Warranty Expires', fieldType: 'date', sortOrder: 122, fieldGroup: 'Warranty' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'CPU Cooler',
    description: 'Air coolers and AIO liquid coolers',
    icon: 'mdi:fan',
    iconColor: '#06b6d4',
    iconBackgroundColor: '#164e63',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Noctua', 'Corsair', 'NZXT', 'be quiet!', 'Cooler Master', 'Arctic', 'DeepCool', 'Thermalright', 'Scythe', 'EK', 'EVGA', 'Lian Li', 'Thermaltake', 'ID-Cooling', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., NH-D15, Kraken X73' },
      { fieldName: 'Product Line', fieldType: 'text', sortOrder: 3, fieldGroup: 'General', placeholder: 'e.g., Kraken, H150i, Dark Rock' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      // Type
      { fieldName: 'Cooler Type', fieldType: 'select', options: ['Air - Tower (Single)', 'Air - Tower (Dual)', 'Air - Top-Down', 'Air - Low Profile', 'AIO - 120mm', 'AIO - 140mm', 'AIO - 240mm', 'AIO - 280mm', 'AIO - 360mm', 'AIO - 420mm', 'Custom Loop'], isRequired: true, sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Radiator Size', fieldType: 'text', sortOrder: 11, fieldGroup: 'Type', placeholder: 'e.g., 360x120x27mm' },
      // Performance
      { fieldName: 'TDP Rating', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 20, fieldGroup: 'Performance', helpText: 'Rated cooling capacity' },
      { fieldName: 'Max CPU TDP', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 21, fieldGroup: 'Performance' },
      // Socket Compatibility
      { fieldName: 'Intel Sockets', fieldType: 'text', sortOrder: 30, fieldGroup: 'Compatibility', placeholder: 'e.g., LGA 1700, 1200, 115x, 2066' },
      { fieldName: 'AMD Sockets', fieldType: 'text', sortOrder: 31, fieldGroup: 'Compatibility', placeholder: 'e.g., AM5, AM4, sTRX4' },
      { fieldName: 'Mounting Hardware', fieldType: 'text', sortOrder: 32, fieldGroup: 'Compatibility', helpText: 'Included mounting kits' },
      // Fan Specs
      { fieldName: 'Fan Count', fieldType: 'number', sortOrder: 40, fieldGroup: 'Fan', minValue: 0 },
      { fieldName: 'Fan Size', fieldType: 'select', options: ['80mm', '92mm', '120mm', '140mm', 'Mixed'], sortOrder: 41, fieldGroup: 'Fan' },
      { fieldName: 'Fan Model', fieldType: 'text', sortOrder: 42, fieldGroup: 'Fan', placeholder: 'e.g., NF-A12x25, ML120' },
      { fieldName: 'Fan RPM Range', fieldType: 'text', sortOrder: 43, fieldGroup: 'Fan', placeholder: 'e.g., 0-2000 RPM' },
      { fieldName: 'Max Airflow', fieldType: 'text', sortOrder: 44, fieldGroup: 'Fan', placeholder: 'e.g., 82.52 CFM' },
      { fieldName: 'Static Pressure', fieldType: 'text', sortOrder: 45, fieldGroup: 'Fan', placeholder: 'e.g., 2.34 mmH2O' },
      { fieldName: 'Noise Level', fieldType: 'unit', unitType: 'decibel', unitOptions: ['dBA'], sortOrder: 46, fieldGroup: 'Fan' },
      { fieldName: 'Fan Bearing', fieldType: 'select', options: ['Sleeve', 'Rifle', 'Fluid Dynamic', 'Magnetic Levitation', 'SSO2', 'Other'], sortOrder: 47, fieldGroup: 'Fan' },
      { fieldName: 'PWM Support', fieldType: 'boolean', sortOrder: 48, fieldGroup: 'Fan' },
      // Pump Specs (AIO)
      { fieldName: 'Pump RPM', fieldType: 'text', sortOrder: 50, fieldGroup: 'Pump', placeholder: 'e.g., 800-2800 RPM' },
      { fieldName: 'Pump Noise', fieldType: 'unit', unitType: 'decibel', unitOptions: ['dBA'], sortOrder: 51, fieldGroup: 'Pump' },
      { fieldName: 'Pump Block Size', fieldType: 'text', sortOrder: 52, fieldGroup: 'Pump', placeholder: 'e.g., 80x80mm' },
      { fieldName: 'Tube Length', fieldType: 'unit', unitType: 'length', unitOptions: ['mm', 'in'], sortOrder: 53, fieldGroup: 'Pump' },
      { fieldName: 'Tube Material', fieldType: 'select', options: ['Rubber', 'Braided Nylon', 'EPDM', 'Silicone'], sortOrder: 54, fieldGroup: 'Pump' },
      { fieldName: 'Coolant', fieldType: 'text', sortOrder: 55, fieldGroup: 'Pump', placeholder: 'e.g., Pre-filled, Propylene Glycol' },
      // Physical
      { fieldName: 'Height', fieldType: 'unit', unitType: 'length', unitOptions: ['mm', 'in'], sortOrder: 60, fieldGroup: 'Physical', helpText: 'Total height for case clearance' },
      { fieldName: 'Width', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 61, fieldGroup: 'Physical' },
      { fieldName: 'Depth', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 62, fieldGroup: 'Physical' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['g', 'kg'], sortOrder: 63, fieldGroup: 'Physical' },
      { fieldName: 'Heatsink Material', fieldType: 'text', sortOrder: 64, fieldGroup: 'Physical', placeholder: 'e.g., Copper base, Aluminum fins' },
      { fieldName: 'Heatpipes', fieldType: 'number', sortOrder: 65, fieldGroup: 'Physical', helpText: 'Number of heatpipes (air coolers)' },
      { fieldName: 'Cold Plate Material', fieldType: 'select', options: ['Copper', 'Aluminum', 'Nickel-Plated Copper'], sortOrder: 66, fieldGroup: 'Physical' },
      // Features
      { fieldName: 'RGB Lighting', fieldType: 'select', options: ['None', 'RGB', 'ARGB', 'LCD Display', 'iCUE', 'CAM', 'Aura Sync', 'Multiple'], sortOrder: 70, fieldGroup: 'Features' },
      { fieldName: 'LCD Display', fieldType: 'boolean', sortOrder: 71, fieldGroup: 'Features', helpText: 'Built-in LCD on pump/cooler' },
      { fieldName: 'Software Control', fieldType: 'text', sortOrder: 72, fieldGroup: 'Features', placeholder: 'e.g., iCUE, CAM, AI Suite' },
      { fieldName: 'Controller Included', fieldType: 'boolean', sortOrder: 73, fieldGroup: 'Features' },
      // RAM Clearance
      { fieldName: 'RAM Clearance', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 80, fieldGroup: 'Clearance', helpText: 'Max RAM height' },
      { fieldName: 'RAM Compatibility Notes', fieldType: 'text', sortOrder: 81, fieldGroup: 'Clearance', placeholder: 'e.g., May block tall RAM in slots 1-2' },
      // Thermal Paste
      { fieldName: 'Thermal Paste Included', fieldType: 'boolean', sortOrder: 90, fieldGroup: 'Accessories' },
      { fieldName: 'Thermal Paste Type', fieldType: 'text', sortOrder: 91, fieldGroup: 'Accessories', placeholder: 'e.g., NT-H1, Pre-applied' },
      // Status
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Tested Good', 'Untested', 'Pump Failed', 'Fan Issue', 'Leak', 'For Parts'], sortOrder: 100, fieldGroup: 'Status' },
      { fieldName: 'Installed In', fieldType: 'text', sortOrder: 101, fieldGroup: 'Status' },
      // Warranty
      { fieldName: 'Warranty', fieldType: 'select', options: ['Active', '2 Years', '3 Years', '5 Years', '6 Years', 'Expired'], sortOrder: 110, fieldGroup: 'Warranty' },
      { fieldName: 'Purchase Date', fieldType: 'date', sortOrder: 111, fieldGroup: 'Warranty' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Gaming Console',
    description: 'Video game consoles and handhelds',
    icon: 'mdi:gamepad-variant',
    iconColor: '#a855f7',
    iconBackgroundColor: '#581c87',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Sony', 'Microsoft', 'Nintendo', 'Valve', 'ASUS', 'Logitech', 'Analogue', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Console', fieldType: 'select', options: ['PlayStation 5', 'PlayStation 5 Digital', 'PlayStation 5 Pro', 'PlayStation 5 Slim', 'PlayStation 5 Slim Digital', 'PlayStation 4 Pro', 'PlayStation 4 Slim', 'PlayStation 4', 'PlayStation 3', 'PlayStation Vita', 'PlayStation Portable', 'Xbox Series X', 'Xbox Series S', 'Xbox One X', 'Xbox One S', 'Xbox One', 'Xbox 360', 'Nintendo Switch OLED', 'Nintendo Switch', 'Nintendo Switch Lite', 'Nintendo Wii U', 'Nintendo Wii', 'Nintendo 3DS XL', 'Nintendo 3DS', 'Nintendo 2DS', 'Steam Deck OLED', 'Steam Deck LCD', 'ROG Ally', 'ROG Ally X', 'Legion Go', 'Other'], isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Model Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General', placeholder: 'e.g., CFI-1215A, 1882' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Region', fieldType: 'select', options: ['North America (NTSC-U)', 'Europe (PAL)', 'Japan (NTSC-J)', 'Asia', 'Australia', 'Region Free'], sortOrder: 5, fieldGroup: 'General' },
      { fieldName: 'Color', fieldType: 'text', sortOrder: 6, fieldGroup: 'General', placeholder: 'e.g., White, Black, Special Edition' },
      { fieldName: 'Edition', fieldType: 'text', sortOrder: 7, fieldGroup: 'General', placeholder: 'e.g., Spider-Man 2 Bundle, Halo Edition' },
      // Hardware Specs
      { fieldName: 'CPU', fieldType: 'text', sortOrder: 10, fieldGroup: 'Hardware', placeholder: 'e.g., AMD Zen 2, 8-core' },
      { fieldName: 'GPU', fieldType: 'text', sortOrder: 11, fieldGroup: 'Hardware', placeholder: 'e.g., AMD RDNA 2, 10.28 TFLOPS' },
      { fieldName: 'RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 12, fieldGroup: 'Hardware' },
      // Storage
      { fieldName: 'Internal Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 20, fieldGroup: 'Storage' },
      { fieldName: 'Storage Type', fieldType: 'select', options: ['SSD', 'HDD', 'eMMC', 'Game Card Only'], sortOrder: 21, fieldGroup: 'Storage' },
      { fieldName: 'Expandable Storage', fieldType: 'text', sortOrder: 22, fieldGroup: 'Storage', placeholder: 'e.g., M.2 NVMe slot, Expansion Card, microSD' },
      { fieldName: 'Available Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 23, fieldGroup: 'Storage', helpText: 'After system files' },
      { fieldName: 'External Storage', fieldType: 'text', sortOrder: 24, fieldGroup: 'Storage', placeholder: 'e.g., 2TB Seagate Expansion' },
      // Display (Handheld)
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['"'], sortOrder: 30, fieldGroup: 'Display', helpText: 'For handhelds' },
      { fieldName: 'Screen Resolution', fieldType: 'text', sortOrder: 31, fieldGroup: 'Display', placeholder: 'e.g., 1280x800, 1920x1080' },
      { fieldName: 'Screen Type', fieldType: 'select', options: ['N/A', 'LCD', 'OLED', 'IPS LCD', 'LED'], sortOrder: 32, fieldGroup: 'Display' },
      { fieldName: 'Refresh Rate', fieldType: 'unit', unitType: 'frequency', unitOptions: ['Hz'], sortOrder: 33, fieldGroup: 'Display' },
      { fieldName: 'HDR Support', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Display' },
      // Video Output
      { fieldName: 'Max Output Resolution', fieldType: 'select', options: ['4K (2160p)', '1440p', '1080p', '720p', '480p', 'N/A'], sortOrder: 40, fieldGroup: 'Video Output' },
      { fieldName: 'Max Frame Rate', fieldType: 'select', options: ['120fps', '60fps', '30fps'], sortOrder: 41, fieldGroup: 'Video Output' },
      { fieldName: 'Video Ports', fieldType: 'text', sortOrder: 42, fieldGroup: 'Video Output', placeholder: 'e.g., HDMI 2.1, USB-C to DP' },
      { fieldName: 'VRR Support', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Video Output', helpText: 'Variable Refresh Rate' },
      // Connectivity
      { fieldName: 'WiFi', fieldType: 'text', sortOrder: 50, fieldGroup: 'Connectivity', placeholder: 'e.g., WiFi 6, 802.11ac' },
      { fieldName: 'Bluetooth', fieldType: 'text', sortOrder: 51, fieldGroup: 'Connectivity', placeholder: 'e.g., Bluetooth 5.1' },
      { fieldName: 'Ethernet', fieldType: 'select', options: ['None', '100Mbps', '1Gbps', '2.5Gbps'], sortOrder: 52, fieldGroup: 'Connectivity' },
      { fieldName: 'USB Ports', fieldType: 'text', sortOrder: 53, fieldGroup: 'Connectivity', placeholder: 'e.g., 2x USB-A, 1x USB-C' },
      // Media
      { fieldName: 'Disc Drive', fieldType: 'select', options: ['None (Digital)', '4K UHD Blu-ray', 'Blu-ray', 'DVD', 'Proprietary'], sortOrder: 60, fieldGroup: 'Media' },
      { fieldName: 'Game Format', fieldType: 'text', sortOrder: 61, fieldGroup: 'Media', placeholder: 'e.g., Disc + Digital, Game Card' },
      // Battery (Handheld)
      { fieldName: 'Battery Capacity', fieldType: 'unit', unitType: 'power', unitOptions: ['Wh', 'mAh'], sortOrder: 70, fieldGroup: 'Battery' },
      { fieldName: 'Battery Life', fieldType: 'text', sortOrder: 71, fieldGroup: 'Battery', placeholder: 'e.g., 4-9 hours' },
      { fieldName: 'Charging', fieldType: 'text', sortOrder: 72, fieldGroup: 'Battery', placeholder: 'e.g., USB-C PD, Proprietary' },
      // Controllers
      { fieldName: 'Included Controller', fieldType: 'text', sortOrder: 80, fieldGroup: 'Controllers', placeholder: 'e.g., DualSense, Joy-Cons' },
      { fieldName: 'Controller Color', fieldType: 'text', sortOrder: 81, fieldGroup: 'Controllers' },
      { fieldName: 'Additional Controllers', fieldType: 'number', sortOrder: 82, fieldGroup: 'Controllers', minValue: 0 },
      // Account/Software
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 90, fieldGroup: 'Software' },
      { fieldName: 'Account Linked', fieldType: 'select', options: ['No', 'Yes - Will Remove', 'Yes - Included', 'Unknown'], sortOrder: 91, fieldGroup: 'Software' },
      { fieldName: 'Digital Games Included', fieldType: 'number', sortOrder: 92, fieldGroup: 'Software', minValue: 0 },
      { fieldName: 'Subscription Active', fieldType: 'text', sortOrder: 93, fieldGroup: 'Software', placeholder: 'e.g., PS Plus until Dec 2025' },
      // Modifications
      { fieldName: 'Modified/Jailbroken', fieldType: 'boolean', sortOrder: 100, fieldGroup: 'Modifications' },
      { fieldName: 'Custom Firmware', fieldType: 'text', sortOrder: 101, fieldGroup: 'Modifications', placeholder: 'e.g., CFW version, Atmosphere' },
      { fieldName: 'Hardware Mods', fieldType: 'text', sortOrder: 102, fieldGroup: 'Modifications', placeholder: 'e.g., SSD upgrade, shell swap' },
      // Condition
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working - Excellent', 'Working - Good', 'Working - Fair', 'Issue - Disc Drive', 'Issue - HDMI', 'Issue - WiFi', 'Issue - Overheating', 'Issue - Other', 'For Parts', 'Untested'], sortOrder: 110, fieldGroup: 'Condition' },
      { fieldName: 'Cosmetic Condition', fieldType: 'select', options: ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'], sortOrder: 111, fieldGroup: 'Condition' },
      { fieldName: 'Condition Notes', fieldType: 'text', sortOrder: 112, fieldGroup: 'Condition', placeholder: 'e.g., Minor scratches on top' },
      // Included Items
      { fieldName: 'Original Box', fieldType: 'boolean', sortOrder: 120, fieldGroup: 'Included' },
      { fieldName: 'Power Cable', fieldType: 'boolean', sortOrder: 121, fieldGroup: 'Included' },
      { fieldName: 'HDMI Cable', fieldType: 'boolean', sortOrder: 122, fieldGroup: 'Included' },
      { fieldName: 'Stand', fieldType: 'boolean', sortOrder: 123, fieldGroup: 'Included' },
      { fieldName: 'Dock', fieldType: 'boolean', sortOrder: 124, fieldGroup: 'Included', helpText: 'For Switch/Steam Deck' },
      { fieldName: 'Carrying Case', fieldType: 'boolean', sortOrder: 125, fieldGroup: 'Included' },
      { fieldName: 'Additional Accessories', fieldType: 'text', sortOrder: 126, fieldGroup: 'Included' },
      // Warranty
      { fieldName: 'Warranty', fieldType: 'select', options: ['Active', '1 Year', 'Expired', 'Unknown'], sortOrder: 130, fieldGroup: 'Warranty' },
      { fieldName: 'Purchase Date', fieldType: 'date', sortOrder: 131, fieldGroup: 'Warranty' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'Television',
    description: 'TVs and displays for home entertainment',
    icon: 'mdi:television',
    iconColor: '#3b82f6',
    iconBackgroundColor: '#1e3a8a',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Vizio', 'Panasonic', 'Philips', 'Sharp', 'Toshiba', 'Insignia', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., QN65S95D, OLED65C4' },
      { fieldName: 'Model Year', fieldType: 'number', sortOrder: 3, fieldGroup: 'General', placeholder: 'e.g., 2024' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Product Line', fieldType: 'text', sortOrder: 5, fieldGroup: 'General', placeholder: 'e.g., Neo QLED, C4, Bravia XR' },
      // Display
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['"'], isRequired: true, sortOrder: 10, fieldGroup: 'Display' },
      { fieldName: 'Resolution', fieldType: 'select', options: ['8K (7680x4320)', '4K (3840x2160)', '1080p (1920x1080)', '720p (1280x720)'], sortOrder: 11, fieldGroup: 'Display' },
      { fieldName: 'Panel Type', fieldType: 'select', options: ['OLED', 'QD-OLED', 'Mini-LED', 'QLED', 'Neo QLED', 'LED', 'ULED', 'NanoCell', 'Plasma'], sortOrder: 12, fieldGroup: 'Display' },
      { fieldName: 'Backlight', fieldType: 'select', options: ['Self-Emissive (OLED)', 'Mini-LED', 'Full Array Local Dimming', 'Edge-Lit', 'Direct-Lit', 'N/A'], sortOrder: 13, fieldGroup: 'Display' },
      { fieldName: 'Dimming Zones', fieldType: 'number', sortOrder: 14, fieldGroup: 'Display', helpText: 'Local dimming zones' },
      { fieldName: 'Refresh Rate', fieldType: 'select', options: ['144Hz', '120Hz', '60Hz', '50Hz'], sortOrder: 15, fieldGroup: 'Display' },
      { fieldName: 'Motion Rate', fieldType: 'text', sortOrder: 16, fieldGroup: 'Display', placeholder: 'e.g., 240 Motion Rate' },
      // Picture Quality
      { fieldName: 'HDR Support', fieldType: 'text', sortOrder: 20, fieldGroup: 'Picture Quality', placeholder: 'e.g., HDR10, HDR10+, Dolby Vision, HLG' },
      { fieldName: 'Peak Brightness', fieldType: 'unit', unitType: 'luminosity', unitOptions: ['nit'], sortOrder: 21, fieldGroup: 'Picture Quality' },
      { fieldName: 'SDR Brightness', fieldType: 'unit', unitType: 'luminosity', unitOptions: ['nit'], sortOrder: 22, fieldGroup: 'Picture Quality' },
      { fieldName: 'Contrast Ratio', fieldType: 'text', sortOrder: 23, fieldGroup: 'Picture Quality', placeholder: 'e.g., Infinite (OLED), 6000:1' },
      { fieldName: 'Color Gamut', fieldType: 'text', sortOrder: 24, fieldGroup: 'Picture Quality', placeholder: 'e.g., 100% DCI-P3, Quantum Dots' },
      { fieldName: 'Color Depth', fieldType: 'select', options: ['10-bit', '10-bit + FRC', '8-bit + FRC', '8-bit'], sortOrder: 25, fieldGroup: 'Picture Quality' },
      { fieldName: 'Viewing Angle', fieldType: 'text', sortOrder: 26, fieldGroup: 'Picture Quality', placeholder: 'e.g., 178°, Wide viewing angle' },
      { fieldName: 'Anti-Reflection', fieldType: 'select', options: ['None', 'Anti-Glare', 'Anti-Reflection', 'Matte'], sortOrder: 27, fieldGroup: 'Picture Quality' },
      // Gaming Features
      { fieldName: 'VRR Support', fieldType: 'text', sortOrder: 30, fieldGroup: 'Gaming', placeholder: 'e.g., FreeSync Premium, G-Sync Compatible' },
      { fieldName: 'ALLM', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Gaming', helpText: 'Auto Low Latency Mode' },
      { fieldName: 'Input Lag (Game Mode)', fieldType: 'unit', unitType: 'time', unitOptions: ['ms'], sortOrder: 32, fieldGroup: 'Gaming' },
      { fieldName: 'Response Time', fieldType: 'unit', unitType: 'time', unitOptions: ['ms'], sortOrder: 33, fieldGroup: 'Gaming' },
      { fieldName: '4K @ 120Hz', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Gaming' },
      { fieldName: 'Game Mode Features', fieldType: 'text', sortOrder: 35, fieldGroup: 'Gaming', placeholder: 'e.g., Game Bar, Game Optimizer' },
      // Smart TV
      { fieldName: 'Smart Platform', fieldType: 'select', options: ['Tizen', 'webOS', 'Google TV', 'Android TV', 'Roku TV', 'Fire TV', 'Vidaa', 'SmartCast', 'None'], sortOrder: 40, fieldGroup: 'Smart TV' },
      { fieldName: 'Voice Assistants', fieldType: 'text', sortOrder: 41, fieldGroup: 'Smart TV', placeholder: 'e.g., Alexa, Google Assistant, Bixby' },
      { fieldName: 'App Store', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Smart TV' },
      { fieldName: 'Screen Mirroring', fieldType: 'text', sortOrder: 43, fieldGroup: 'Smart TV', placeholder: 'e.g., AirPlay 2, Chromecast, Miracast' },
      // Audio
      { fieldName: 'Speaker Output', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 50, fieldGroup: 'Audio' },
      { fieldName: 'Speaker Configuration', fieldType: 'text', sortOrder: 51, fieldGroup: 'Audio', placeholder: 'e.g., 2.2ch, 4.2ch, 60W' },
      { fieldName: 'Dolby Atmos', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Audio' },
      { fieldName: 'eARC', fieldType: 'boolean', sortOrder: 53, fieldGroup: 'Audio', helpText: 'Enhanced Audio Return Channel' },
      { fieldName: 'Bluetooth Audio Out', fieldType: 'boolean', sortOrder: 54, fieldGroup: 'Audio' },
      // Connectivity
      { fieldName: 'HDMI Ports', fieldType: 'number', sortOrder: 60, fieldGroup: 'Connectivity' },
      { fieldName: 'HDMI 2.1 Ports', fieldType: 'number', sortOrder: 61, fieldGroup: 'Connectivity' },
      { fieldName: 'USB Ports', fieldType: 'number', sortOrder: 62, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 63, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'text', sortOrder: 64, fieldGroup: 'Connectivity', placeholder: 'e.g., WiFi 6, WiFi 5' },
      { fieldName: 'Bluetooth', fieldType: 'text', sortOrder: 65, fieldGroup: 'Connectivity', placeholder: 'e.g., Bluetooth 5.2' },
      { fieldName: 'Optical Audio Out', fieldType: 'boolean', sortOrder: 66, fieldGroup: 'Connectivity' },
      { fieldName: 'RF/Antenna In', fieldType: 'boolean', sortOrder: 67, fieldGroup: 'Connectivity' },
      { fieldName: 'Composite/Component', fieldType: 'text', sortOrder: 68, fieldGroup: 'Connectivity', placeholder: 'e.g., 1x Composite' },
      // Physical
      { fieldName: 'Dimensions (with Stand)', fieldType: 'text', sortOrder: 70, fieldGroup: 'Physical', placeholder: 'W x H x D in mm or inches' },
      { fieldName: 'Dimensions (without Stand)', fieldType: 'text', sortOrder: 71, fieldGroup: 'Physical', placeholder: 'W x H x D in mm or inches' },
      { fieldName: 'Weight (with Stand)', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 72, fieldGroup: 'Physical' },
      { fieldName: 'Weight (without Stand)', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 73, fieldGroup: 'Physical' },
      { fieldName: 'VESA Mount', fieldType: 'text', sortOrder: 74, fieldGroup: 'Physical', placeholder: 'e.g., 300x300mm, 400x400mm' },
      { fieldName: 'Stand Type', fieldType: 'select', options: ['Center Stand', 'Wide Feet', 'Edge Feet', 'Pedestal', 'Swivel', 'None'], sortOrder: 75, fieldGroup: 'Physical' },
      { fieldName: 'Bezel Design', fieldType: 'select', options: ['Bezel-less', 'Thin Bezel', 'Standard Bezel'], sortOrder: 76, fieldGroup: 'Physical' },
      // Power
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 80, fieldGroup: 'Power' },
      { fieldName: 'Standby Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 81, fieldGroup: 'Power' },
      { fieldName: 'Energy Rating', fieldType: 'text', sortOrder: 82, fieldGroup: 'Power', placeholder: 'e.g., Energy Star, EU Rating' },
      // Remote & Control
      { fieldName: 'Remote Type', fieldType: 'text', sortOrder: 90, fieldGroup: 'Remote', placeholder: 'e.g., Solar Cell, Magic Remote, Voice' },
      { fieldName: 'Remote Model', fieldType: 'text', sortOrder: 91, fieldGroup: 'Remote' },
      // Condition
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working - Excellent', 'Working - Good', 'Screen Issue', 'Backlight Issue', 'Sound Issue', 'Smart Features Issue', 'For Parts'], sortOrder: 100, fieldGroup: 'Condition' },
      { fieldName: 'Screen Condition', fieldType: 'select', options: ['Perfect', 'Minor Scratches', 'Dead Pixels', 'Burn-in', 'Cracked'], sortOrder: 101, fieldGroup: 'Condition' },
      { fieldName: 'Burn-in', fieldType: 'select', options: ['None', 'Very Light', 'Noticeable', 'Severe'], sortOrder: 102, fieldGroup: 'Condition', helpText: 'For OLED TVs' },
      // Included
      { fieldName: 'Original Box', fieldType: 'boolean', sortOrder: 110, fieldGroup: 'Included' },
      { fieldName: 'Remote Included', fieldType: 'boolean', sortOrder: 111, fieldGroup: 'Included' },
      { fieldName: 'Stand Included', fieldType: 'boolean', sortOrder: 112, fieldGroup: 'Included' },
      { fieldName: 'Power Cable', fieldType: 'boolean', sortOrder: 113, fieldGroup: 'Included' },
      { fieldName: 'Wall Mount', fieldType: 'boolean', sortOrder: 114, fieldGroup: 'Included' },
      // Warranty
      { fieldName: 'Warranty', fieldType: 'select', options: ['Active', '1 Year', '2 Years', 'Extended', 'Expired'], sortOrder: 120, fieldGroup: 'Warranty' },
      { fieldName: 'Purchase Date', fieldType: 'date', sortOrder: 121, fieldGroup: 'Warranty' }
    ],
    suggests: ['Power Adapter', 'Cable', 'Soundbar']
  },
  {
    name: 'Soundbar',
    description: 'Soundbars and sound systems',
    icon: 'mdi:soundbar',
    iconColor: '#f97316',
    iconBackgroundColor: '#7c2d12',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Samsung', 'LG', 'Sony', 'Sonos', 'Bose', 'JBL', 'Vizio', 'Yamaha', 'Denon', 'Polk', 'Klipsch', 'TCL', 'Hisense', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., HW-Q990D, Arc, Beam' },
      { fieldName: 'Model Year', fieldType: 'number', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Product Line', fieldType: 'text', sortOrder: 5, fieldGroup: 'General', placeholder: 'e.g., Q-Series, Arc, Bar 9.1' },
      // Audio Configuration
      { fieldName: 'Channel Configuration', fieldType: 'select', options: ['2.0', '2.1', '3.0', '3.1', '5.0', '5.1', '5.1.2', '5.1.4', '7.1', '7.1.2', '7.1.4', '9.1.4', '11.1.4'], isRequired: true, sortOrder: 10, fieldGroup: 'Audio' },
      { fieldName: 'Total Power Output', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 11, fieldGroup: 'Audio' },
      { fieldName: 'Soundbar Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 12, fieldGroup: 'Audio' },
      { fieldName: 'Driver Count', fieldType: 'number', sortOrder: 13, fieldGroup: 'Audio' },
      { fieldName: 'Driver Size', fieldType: 'text', sortOrder: 14, fieldGroup: 'Audio', placeholder: 'e.g., 4x 46mm, 2x tweeters' },
      // Dolby/DTS
      { fieldName: 'Dolby Atmos', fieldType: 'boolean', sortOrder: 20, fieldGroup: 'Surround' },
      { fieldName: 'DTS:X', fieldType: 'boolean', sortOrder: 21, fieldGroup: 'Surround' },
      { fieldName: 'Dolby Digital', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Surround' },
      { fieldName: 'Dolby Digital Plus', fieldType: 'boolean', sortOrder: 23, fieldGroup: 'Surround' },
      { fieldName: 'Up-firing Speakers', fieldType: 'boolean', sortOrder: 24, fieldGroup: 'Surround', helpText: 'For Atmos height effects' },
      { fieldName: 'Side-firing Speakers', fieldType: 'boolean', sortOrder: 25, fieldGroup: 'Surround' },
      // Subwoofer
      { fieldName: 'Subwoofer Included', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Subwoofer' },
      { fieldName: 'Subwoofer Type', fieldType: 'select', options: ['Wireless', 'Wired', 'Built-in', 'None'], sortOrder: 31, fieldGroup: 'Subwoofer' },
      { fieldName: 'Subwoofer Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 32, fieldGroup: 'Subwoofer' },
      { fieldName: 'Subwoofer Driver', fieldType: 'text', sortOrder: 33, fieldGroup: 'Subwoofer', placeholder: 'e.g., 8" woofer' },
      // Rear Speakers
      { fieldName: 'Rear Speakers Included', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Rear Speakers' },
      { fieldName: 'Rear Speaker Type', fieldType: 'text', sortOrder: 41, fieldGroup: 'Rear Speakers', placeholder: 'e.g., Wireless, Up-firing' },
      { fieldName: 'Rear Speaker Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 42, fieldGroup: 'Rear Speakers' },
      { fieldName: 'Expandable Rear', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Rear Speakers', helpText: 'Can add rear speakers later' },
      // Connectivity
      { fieldName: 'HDMI In', fieldType: 'number', sortOrder: 50, fieldGroup: 'Connectivity' },
      { fieldName: 'HDMI Out (ARC/eARC)', fieldType: 'number', sortOrder: 51, fieldGroup: 'Connectivity' },
      { fieldName: 'eARC Support', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Connectivity' },
      { fieldName: 'HDMI Passthrough', fieldType: 'text', sortOrder: 53, fieldGroup: 'Connectivity', placeholder: 'e.g., 4K/120Hz, 8K/60Hz' },
      { fieldName: 'Optical In', fieldType: 'boolean', sortOrder: 54, fieldGroup: 'Connectivity' },
      { fieldName: 'Aux In (3.5mm)', fieldType: 'boolean', sortOrder: 55, fieldGroup: 'Connectivity' },
      { fieldName: 'USB Port', fieldType: 'boolean', sortOrder: 56, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 57, fieldGroup: 'Connectivity' },
      // Wireless
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 60, fieldGroup: 'Wireless' },
      { fieldName: 'Bluetooth', fieldType: 'text', sortOrder: 61, fieldGroup: 'Wireless', placeholder: 'e.g., Bluetooth 5.0' },
      { fieldName: 'Bluetooth Codecs', fieldType: 'text', sortOrder: 62, fieldGroup: 'Wireless', placeholder: 'e.g., SBC, AAC, aptX' },
      { fieldName: 'AirPlay 2', fieldType: 'boolean', sortOrder: 63, fieldGroup: 'Wireless' },
      { fieldName: 'Chromecast', fieldType: 'boolean', sortOrder: 64, fieldGroup: 'Wireless' },
      { fieldName: 'Spotify Connect', fieldType: 'boolean', sortOrder: 65, fieldGroup: 'Wireless' },
      // Smart Features
      { fieldName: 'Voice Assistant', fieldType: 'text', sortOrder: 70, fieldGroup: 'Smart Features', placeholder: 'e.g., Alexa Built-in, Google Assistant' },
      { fieldName: 'App Control', fieldType: 'text', sortOrder: 71, fieldGroup: 'Smart Features', placeholder: 'e.g., SmartThings, Sonos App' },
      { fieldName: 'Multi-Room Audio', fieldType: 'text', sortOrder: 72, fieldGroup: 'Smart Features', placeholder: 'e.g., Sonos, Google Home, Alexa MRM' },
      { fieldName: 'Room Correction', fieldType: 'text', sortOrder: 73, fieldGroup: 'Smart Features', placeholder: 'e.g., SpaceFit, TruePlay, Audyssey' },
      // Sound Modes
      { fieldName: 'Sound Modes', fieldType: 'text', sortOrder: 80, fieldGroup: 'Sound Modes', placeholder: 'e.g., Movie, Music, Voice, Game' },
      { fieldName: 'Night Mode', fieldType: 'boolean', sortOrder: 81, fieldGroup: 'Sound Modes' },
      { fieldName: 'Voice Enhancement', fieldType: 'boolean', sortOrder: 82, fieldGroup: 'Sound Modes' },
      { fieldName: 'Adaptive Sound', fieldType: 'boolean', sortOrder: 83, fieldGroup: 'Sound Modes' },
      // Physical
      { fieldName: 'Soundbar Dimensions', fieldType: 'text', sortOrder: 90, fieldGroup: 'Physical', placeholder: 'W x H x D' },
      { fieldName: 'Soundbar Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 91, fieldGroup: 'Physical' },
      { fieldName: 'Subwoofer Dimensions', fieldType: 'text', sortOrder: 92, fieldGroup: 'Physical', placeholder: 'W x H x D' },
      { fieldName: 'Subwoofer Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 93, fieldGroup: 'Physical' },
      { fieldName: 'Color', fieldType: 'select', options: ['Black', 'White', 'Gray', 'Silver', 'Other'], sortOrder: 94, fieldGroup: 'Physical' },
      { fieldName: 'Wall Mountable', fieldType: 'boolean', sortOrder: 95, fieldGroup: 'Physical' },
      // Remote
      { fieldName: 'Remote Included', fieldType: 'boolean', sortOrder: 100, fieldGroup: 'Remote' },
      { fieldName: 'Remote Type', fieldType: 'text', sortOrder: 101, fieldGroup: 'Remote', placeholder: 'e.g., IR, Bluetooth, One Remote' },
      // Condition
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working - Excellent', 'Working - Good', 'Sound Issue', 'Connectivity Issue', 'Subwoofer Issue', 'For Parts'], sortOrder: 110, fieldGroup: 'Condition' },
      { fieldName: 'Cosmetic Condition', fieldType: 'select', options: ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'], sortOrder: 111, fieldGroup: 'Condition' },
      // Included
      { fieldName: 'Original Box', fieldType: 'boolean', sortOrder: 120, fieldGroup: 'Included' },
      { fieldName: 'Power Cable(s)', fieldType: 'boolean', sortOrder: 121, fieldGroup: 'Included' },
      { fieldName: 'HDMI Cable', fieldType: 'boolean', sortOrder: 122, fieldGroup: 'Included' },
      { fieldName: 'Optical Cable', fieldType: 'boolean', sortOrder: 123, fieldGroup: 'Included' },
      { fieldName: 'Wall Mount Bracket', fieldType: 'boolean', sortOrder: 124, fieldGroup: 'Included' },
      // Warranty
      { fieldName: 'Warranty', fieldType: 'select', options: ['Active', '1 Year', '2 Years', 'Expired'], sortOrder: 130, fieldGroup: 'Warranty' },
      { fieldName: 'Purchase Date', fieldType: 'date', sortOrder: 131, fieldGroup: 'Warranty' }
    ],
    suggests: ['Power Adapter', 'Cable', 'Subwoofer']
  },
  {
    name: 'Subwoofer',
    description: 'Standalone subwoofers for audio systems',
    icon: 'mdi:speaker',
    iconColor: '#eab308',
    iconBackgroundColor: '#713f12',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['SVS', 'REL', 'Klipsch', 'Polk', 'JBL', 'Yamaha', 'Sonos', 'Samsung', 'LG', 'Sony', 'Bose', 'Monoprice', 'Dayton Audio', 'HSU Research', 'Rythmik', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., SB-3000, T/9i, R-120SW' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Type', fieldType: 'select', options: ['Powered (Active)', 'Passive', 'Wireless'], sortOrder: 4, fieldGroup: 'General' },
      // Driver
      { fieldName: 'Driver Size', fieldType: 'unit', unitType: 'length', unitOptions: ['"'], isRequired: true, sortOrder: 10, fieldGroup: 'Driver' },
      { fieldName: 'Driver Count', fieldType: 'number', sortOrder: 11, fieldGroup: 'Driver', minValue: 1 },
      { fieldName: 'Driver Type', fieldType: 'select', options: ['Front-Firing', 'Down-Firing', 'Side-Firing', 'Dual Opposed', 'Passive Radiator'], sortOrder: 12, fieldGroup: 'Driver' },
      { fieldName: 'Driver Material', fieldType: 'text', sortOrder: 13, fieldGroup: 'Driver', placeholder: 'e.g., Aluminum cone, Fiber composite' },
      { fieldName: 'Passive Radiators', fieldType: 'number', sortOrder: 14, fieldGroup: 'Driver', minValue: 0 },
      // Amplifier
      { fieldName: 'Amplifier Power (RMS)', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 20, fieldGroup: 'Amplifier' },
      { fieldName: 'Amplifier Power (Peak)', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 21, fieldGroup: 'Amplifier' },
      { fieldName: 'Amplifier Type', fieldType: 'select', options: ['Class D', 'Class AB', 'Class A', 'Class H', 'N/A (Passive)'], sortOrder: 22, fieldGroup: 'Amplifier' },
      // Performance
      { fieldName: 'Frequency Response', fieldType: 'text', sortOrder: 30, fieldGroup: 'Performance', placeholder: 'e.g., 19Hz - 200Hz (±3dB)' },
      { fieldName: 'Low Frequency Extension', fieldType: 'unit', unitType: 'frequency', unitOptions: ['Hz'], sortOrder: 31, fieldGroup: 'Performance', helpText: '-3dB point' },
      { fieldName: 'Max SPL', fieldType: 'unit', unitType: 'decibel', unitOptions: ['dB'], sortOrder: 32, fieldGroup: 'Performance' },
      // Controls
      { fieldName: 'Volume Control', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Controls' },
      { fieldName: 'Crossover Control', fieldType: 'text', sortOrder: 41, fieldGroup: 'Controls', placeholder: 'e.g., 50-200Hz, LFE Bypass' },
      { fieldName: 'Phase Control', fieldType: 'text', sortOrder: 42, fieldGroup: 'Controls', placeholder: 'e.g., 0/180, Variable' },
      { fieldName: 'Room EQ / DSP', fieldType: 'text', sortOrder: 43, fieldGroup: 'Controls', placeholder: 'e.g., SVS App, Audyssey' },
      { fieldName: 'Presets', fieldType: 'text', sortOrder: 44, fieldGroup: 'Controls', placeholder: 'e.g., Music, Movie, Custom' },
      // Connectivity
      { fieldName: 'LFE Input', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Connectivity' },
      { fieldName: 'Line Level Input', fieldType: 'text', sortOrder: 51, fieldGroup: 'Connectivity', placeholder: 'e.g., RCA L/R, XLR' },
      { fieldName: 'Speaker Level Input', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Connectivity' },
      { fieldName: 'Speaker Level Output', fieldType: 'boolean', sortOrder: 53, fieldGroup: 'Connectivity' },
      { fieldName: 'Wireless', fieldType: 'text', sortOrder: 54, fieldGroup: 'Connectivity', placeholder: 'e.g., Built-in, Optional adapter' },
      { fieldName: 'App Control', fieldType: 'text', sortOrder: 55, fieldGroup: 'Connectivity', placeholder: 'e.g., SVS App, Sonos App' },
      { fieldName: 'USB Port', fieldType: 'boolean', sortOrder: 56, fieldGroup: 'Connectivity', helpText: 'For firmware updates' },
      { fieldName: '12V Trigger', fieldType: 'boolean', sortOrder: 57, fieldGroup: 'Connectivity' },
      // Enclosure
      { fieldName: 'Enclosure Type', fieldType: 'select', options: ['Sealed', 'Ported', 'Passive Radiator', 'Bandpass', 'Isobaric'], sortOrder: 60, fieldGroup: 'Enclosure' },
      { fieldName: 'Port Size', fieldType: 'text', sortOrder: 61, fieldGroup: 'Enclosure', placeholder: 'e.g., 3" flared port' },
      { fieldName: 'Cabinet Material', fieldType: 'text', sortOrder: 62, fieldGroup: 'Enclosure', placeholder: 'e.g., MDF, Aluminum' },
      { fieldName: 'Finish', fieldType: 'text', sortOrder: 63, fieldGroup: 'Enclosure', placeholder: 'e.g., Black Ash, Piano Gloss' },
      // Physical
      { fieldName: 'Dimensions', fieldType: 'text', sortOrder: 70, fieldGroup: 'Physical', placeholder: 'W x H x D' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 71, fieldGroup: 'Physical' },
      { fieldName: 'Grille Included', fieldType: 'boolean', sortOrder: 72, fieldGroup: 'Physical' },
      { fieldName: 'Feet/Spikes', fieldType: 'text', sortOrder: 73, fieldGroup: 'Physical', placeholder: 'e.g., Rubber feet, Isolation feet' },
      // Power
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 80, fieldGroup: 'Power' },
      { fieldName: 'Standby Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 81, fieldGroup: 'Power' },
      { fieldName: 'Auto On/Off', fieldType: 'boolean', sortOrder: 82, fieldGroup: 'Power' },
      { fieldName: 'Input Voltage', fieldType: 'text', sortOrder: 83, fieldGroup: 'Power', placeholder: 'e.g., 120V/240V switchable' },
      // Condition
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working - Excellent', 'Working - Good', 'Amplifier Issue', 'Driver Issue', 'Noise/Hum', 'For Parts'], sortOrder: 90, fieldGroup: 'Condition' },
      { fieldName: 'Cosmetic Condition', fieldType: 'select', options: ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'], sortOrder: 91, fieldGroup: 'Condition' },
      // Included
      { fieldName: 'Original Box', fieldType: 'boolean', sortOrder: 100, fieldGroup: 'Included' },
      { fieldName: 'Power Cable', fieldType: 'boolean', sortOrder: 101, fieldGroup: 'Included' },
      { fieldName: 'Grille', fieldType: 'boolean', sortOrder: 102, fieldGroup: 'Included' },
      { fieldName: 'Isolation Feet', fieldType: 'boolean', sortOrder: 103, fieldGroup: 'Included' },
      // Warranty
      { fieldName: 'Warranty', fieldType: 'select', options: ['Active', '2 Years', '3 Years', '5 Years', 'Expired'], sortOrder: 110, fieldGroup: 'Warranty' },
      { fieldName: 'Purchase Date', fieldType: 'date', sortOrder: 111, fieldGroup: 'Warranty' }
    ],
    suggests: ['Power Adapter', 'Cable', 'Soundbar']
  },
  {
    name: 'Printer',
    description: 'Printers, scanners, and multifunction devices',
    icon: 'mdi:printer',
    iconColor: '#64748b',
    iconBackgroundColor: '#1e293b',
    fields: [
      // General
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['HP', 'Canon', 'Epson', 'Brother', 'Xerox', 'Lexmark', 'Ricoh', 'Kyocera', 'Samsung', 'Dell', 'Konica Minolta', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General', placeholder: 'e.g., LaserJet Pro M404dn' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Asset Tag', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      // Type
      { fieldName: 'Printer Type', fieldType: 'select', options: ['Laser (Mono)', 'Laser (Color)', 'Inkjet', 'Inkjet (Photo)', 'InkTank/EcoTank', 'Thermal', 'Dot Matrix', 'Dye Sublimation', 'Label Printer', '3D Printer'], isRequired: true, sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Function', fieldType: 'select', options: ['Print Only', 'Print/Scan', 'Print/Scan/Copy', 'Print/Scan/Copy/Fax', 'All-in-One'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Intended Use', fieldType: 'select', options: ['Home', 'Home Office', 'Small Business', 'Workgroup', 'Enterprise', 'Production'], sortOrder: 12, fieldGroup: 'Type' },
      // Print Specs
      { fieldName: 'Print Speed (Mono)', fieldType: 'text', sortOrder: 20, fieldGroup: 'Print', placeholder: 'e.g., 40 ppm' },
      { fieldName: 'Print Speed (Color)', fieldType: 'text', sortOrder: 21, fieldGroup: 'Print', placeholder: 'e.g., 20 ppm' },
      { fieldName: 'Print Resolution', fieldType: 'text', sortOrder: 22, fieldGroup: 'Print', placeholder: 'e.g., 1200 x 1200 dpi' },
      { fieldName: 'First Page Out', fieldType: 'text', sortOrder: 23, fieldGroup: 'Print', placeholder: 'e.g., 6 seconds' },
      { fieldName: 'Duplex Printing', fieldType: 'select', options: ['None', 'Manual', 'Automatic'], sortOrder: 24, fieldGroup: 'Print' },
      { fieldName: 'Monthly Duty Cycle', fieldType: 'text', sortOrder: 25, fieldGroup: 'Print', placeholder: 'e.g., 80,000 pages' },
      { fieldName: 'Recommended Monthly Volume', fieldType: 'text', sortOrder: 26, fieldGroup: 'Print', placeholder: 'e.g., 750-4,000 pages' },
      // Scan Specs
      { fieldName: 'Scanner Type', fieldType: 'select', options: ['N/A', 'Flatbed', 'ADF Only', 'Flatbed + ADF'], sortOrder: 30, fieldGroup: 'Scan' },
      { fieldName: 'Scan Resolution', fieldType: 'text', sortOrder: 31, fieldGroup: 'Scan', placeholder: 'e.g., 1200 x 1200 dpi' },
      { fieldName: 'ADF Capacity', fieldType: 'number', sortOrder: 32, fieldGroup: 'Scan', helpText: 'Pages' },
      { fieldName: 'Duplex ADF', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Scan' },
      { fieldName: 'ADF Speed', fieldType: 'text', sortOrder: 34, fieldGroup: 'Scan', placeholder: 'e.g., 50 ipm' },
      { fieldName: 'Scan to Email', fieldType: 'boolean', sortOrder: 35, fieldGroup: 'Scan' },
      { fieldName: 'Scan to Cloud', fieldType: 'boolean', sortOrder: 36, fieldGroup: 'Scan' },
      { fieldName: 'OCR', fieldType: 'boolean', sortOrder: 37, fieldGroup: 'Scan' },
      // Paper Handling
      { fieldName: 'Input Tray Capacity', fieldType: 'number', sortOrder: 40, fieldGroup: 'Paper', helpText: 'Sheets' },
      { fieldName: 'Output Tray Capacity', fieldType: 'number', sortOrder: 41, fieldGroup: 'Paper', helpText: 'Sheets' },
      { fieldName: 'Additional Trays', fieldType: 'text', sortOrder: 42, fieldGroup: 'Paper', placeholder: 'e.g., 2nd 550-sheet tray' },
      { fieldName: 'Max Paper Size', fieldType: 'select', options: ['Letter/A4', 'Legal', 'Ledger/A3', 'Wide Format'], sortOrder: 43, fieldGroup: 'Paper' },
      { fieldName: 'Supported Paper Sizes', fieldType: 'text', sortOrder: 44, fieldGroup: 'Paper', placeholder: 'e.g., Letter, Legal, A4, A5, Envelopes' },
      { fieldName: 'Supported Media Types', fieldType: 'text', sortOrder: 45, fieldGroup: 'Paper', placeholder: 'e.g., Plain, Card stock, Labels, Envelopes' },
      { fieldName: 'Borderless Printing', fieldType: 'boolean', sortOrder: 46, fieldGroup: 'Paper' },
      // Consumables
      { fieldName: 'Toner/Ink Type', fieldType: 'text', sortOrder: 50, fieldGroup: 'Consumables', placeholder: 'e.g., HP 58A, Canon 055' },
      { fieldName: 'Black Cartridge Yield', fieldType: 'text', sortOrder: 51, fieldGroup: 'Consumables', placeholder: 'e.g., 3,000 pages' },
      { fieldName: 'Color Cartridge Yield', fieldType: 'text', sortOrder: 52, fieldGroup: 'Consumables', placeholder: 'e.g., 2,100 pages each' },
      { fieldName: 'High Yield Available', fieldType: 'boolean', sortOrder: 53, fieldGroup: 'Consumables' },
      { fieldName: 'Drum Separate', fieldType: 'boolean', sortOrder: 54, fieldGroup: 'Consumables', helpText: 'Separate drum unit vs integrated' },
      { fieldName: 'Ink Tank System', fieldType: 'boolean', sortOrder: 55, fieldGroup: 'Consumables', helpText: 'Refillable ink tanks' },
      { fieldName: 'Current Toner/Ink Level', fieldType: 'text', sortOrder: 56, fieldGroup: 'Consumables', placeholder: 'e.g., Black 50%, Colors 75%' },
      // Connectivity
      { fieldName: 'USB Port', fieldType: 'text', sortOrder: 60, fieldGroup: 'Connectivity', placeholder: 'e.g., USB 2.0, USB 3.0' },
      { fieldName: 'Ethernet', fieldType: 'text', sortOrder: 61, fieldGroup: 'Connectivity', placeholder: 'e.g., Gigabit, 10/100' },
      { fieldName: 'WiFi', fieldType: 'text', sortOrder: 62, fieldGroup: 'Connectivity', placeholder: 'e.g., 802.11ac, WiFi Direct' },
      { fieldName: 'WiFi Direct', fieldType: 'boolean', sortOrder: 63, fieldGroup: 'Connectivity' },
      { fieldName: 'NFC', fieldType: 'boolean', sortOrder: 64, fieldGroup: 'Connectivity' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 65, fieldGroup: 'Connectivity' },
      { fieldName: 'Fax Modem', fieldType: 'boolean', sortOrder: 66, fieldGroup: 'Connectivity' },
      // Mobile/Cloud Printing
      { fieldName: 'AirPrint', fieldType: 'boolean', sortOrder: 70, fieldGroup: 'Mobile' },
      { fieldName: 'Google Cloud Print', fieldType: 'boolean', sortOrder: 71, fieldGroup: 'Mobile' },
      { fieldName: 'Mopria', fieldType: 'boolean', sortOrder: 72, fieldGroup: 'Mobile' },
      { fieldName: 'Mobile App', fieldType: 'text', sortOrder: 73, fieldGroup: 'Mobile', placeholder: 'e.g., HP Smart, Canon PRINT' },
      { fieldName: 'Cloud Services', fieldType: 'text', sortOrder: 74, fieldGroup: 'Mobile', placeholder: 'e.g., Google Drive, Dropbox, OneDrive' },
      // Display & Control
      { fieldName: 'Display Type', fieldType: 'select', options: ['None', 'LCD', 'LED', 'Touchscreen', 'Color Touchscreen'], sortOrder: 80, fieldGroup: 'Display' },
      { fieldName: 'Display Size', fieldType: 'text', sortOrder: 81, fieldGroup: 'Display', placeholder: 'e.g., 4.3" color touchscreen' },
      // Security
      { fieldName: 'Secure Print', fieldType: 'boolean', sortOrder: 90, fieldGroup: 'Security' },
      { fieldName: 'PIN/Password Printing', fieldType: 'boolean', sortOrder: 91, fieldGroup: 'Security' },
      { fieldName: 'Card Reader', fieldType: 'boolean', sortOrder: 92, fieldGroup: 'Security', helpText: 'For badge/card authentication' },
      { fieldName: 'Encryption', fieldType: 'boolean', sortOrder: 93, fieldGroup: 'Security' },
      // Physical
      { fieldName: 'Dimensions', fieldType: 'text', sortOrder: 100, fieldGroup: 'Physical', placeholder: 'W x D x H' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 101, fieldGroup: 'Physical' },
      // Power
      { fieldName: 'Power Consumption (Active)', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 110, fieldGroup: 'Power' },
      { fieldName: 'Power Consumption (Sleep)', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 111, fieldGroup: 'Power' },
      { fieldName: 'Energy Star', fieldType: 'boolean', sortOrder: 112, fieldGroup: 'Power' },
      // Network
      { fieldName: 'IP Address', fieldType: 'text', sortOrder: 120, fieldGroup: 'Network' },
      { fieldName: 'Hostname', fieldType: 'text', sortOrder: 121, fieldGroup: 'Network' },
      { fieldName: 'Web Interface', fieldType: 'url', sortOrder: 122, fieldGroup: 'Network' },
      // Firmware
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 130, fieldGroup: 'Firmware' },
      // Page Count
      { fieldName: 'Total Page Count', fieldType: 'number', sortOrder: 140, fieldGroup: 'Usage' },
      { fieldName: 'Color Page Count', fieldType: 'number', sortOrder: 141, fieldGroup: 'Usage' },
      { fieldName: 'Scan Count', fieldType: 'number', sortOrder: 142, fieldGroup: 'Usage' },
      // Condition
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working - Excellent', 'Working - Good', 'Paper Jam Issues', 'Print Quality Issues', 'Scanner Issue', 'Network Issue', 'For Parts'], sortOrder: 150, fieldGroup: 'Condition' },
      { fieldName: 'Cosmetic Condition', fieldType: 'select', options: ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'], sortOrder: 151, fieldGroup: 'Condition' },
      // Included
      { fieldName: 'Original Box', fieldType: 'boolean', sortOrder: 160, fieldGroup: 'Included' },
      { fieldName: 'Power Cable', fieldType: 'boolean', sortOrder: 161, fieldGroup: 'Included' },
      { fieldName: 'USB Cable', fieldType: 'boolean', sortOrder: 162, fieldGroup: 'Included' },
      { fieldName: 'Starter Toner/Ink', fieldType: 'boolean', sortOrder: 163, fieldGroup: 'Included' },
      { fieldName: 'Software/Drivers CD', fieldType: 'boolean', sortOrder: 164, fieldGroup: 'Included' },
      // Warranty
      { fieldName: 'Warranty', fieldType: 'select', options: ['Active', '1 Year', '2 Years', '3 Years', 'Extended', 'Expired'], sortOrder: 170, fieldGroup: 'Warranty' },
      { fieldName: 'Purchase Date', fieldType: 'date', sortOrder: 171, fieldGroup: 'Warranty' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  // ==================== NETWORKING & INFRASTRUCTURE ====================
  {
    name: 'Access Point',
    description: 'Standalone wireless access points',
    icon: 'mdi:access-point',
    iconColor: '#22d3ee',
    iconBackgroundColor: '#164e63',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'text', sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'MAC Address', fieldType: 'text', sortOrder: 4, fieldGroup: 'General', placeholder: 'AA:BB:CC:DD:EE:FF' },
      { fieldName: 'WiFi Standard', fieldType: 'select', options: ['WiFi 4 (802.11n)', 'WiFi 5 (802.11ac)', 'WiFi 6 (802.11ax)', 'WiFi 6E', 'WiFi 7 (802.11be)'], sortOrder: 10, fieldGroup: 'Wireless' },
      { fieldName: 'Frequency Bands', fieldType: 'select', options: ['2.4GHz Only', '5GHz Only', 'Dual Band', 'Tri-Band'], sortOrder: 11, fieldGroup: 'Wireless' },
      { fieldName: 'Max Speed', fieldType: 'text', sortOrder: 12, fieldGroup: 'Wireless', placeholder: 'e.g., AX3600' },
      { fieldName: 'Antenna Type', fieldType: 'select', options: ['Internal', 'External', 'Detachable'], sortOrder: 13, fieldGroup: 'Wireless' },
      { fieldName: 'Antenna Count', fieldType: 'number', sortOrder: 14, fieldGroup: 'Wireless' },
      { fieldName: 'MU-MIMO', fieldType: 'select', options: ['None', '2x2', '4x4', '8x8'], sortOrder: 15, fieldGroup: 'Wireless' },
      { fieldName: 'Max Clients', fieldType: 'number', sortOrder: 16, fieldGroup: 'Wireless' },
      { fieldName: 'Coverage Area', fieldType: 'text', sortOrder: 17, fieldGroup: 'Wireless', placeholder: 'e.g., 3000 sq ft' },
      { fieldName: 'Ethernet Ports', fieldType: 'number', sortOrder: 20, fieldGroup: 'Ports', minValue: 1 },
      { fieldName: 'Port Speed', fieldType: 'select', options: ['100Mbps', '1Gbps', '2.5Gbps'], sortOrder: 21, fieldGroup: 'Ports' },
      { fieldName: 'PoE Standard', fieldType: 'select', options: ['None', '802.3af', '802.3at', '802.3bt', 'Passive 24V'], sortOrder: 30, fieldGroup: 'Power' },
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 31, fieldGroup: 'Power' },
      { fieldName: 'Mount Type', fieldType: 'select', options: ['Ceiling', 'Wall', 'Desktop', 'Outdoor'], sortOrder: 40, fieldGroup: 'Physical' },
      { fieldName: 'IP Rating', fieldType: 'text', sortOrder: 41, fieldGroup: 'Physical', placeholder: 'e.g., IP67' },
      { fieldName: 'Management', fieldType: 'select', options: ['Standalone', 'Controller-Based', 'Cloud-Managed'], sortOrder: 50, fieldGroup: 'Management' },
      { fieldName: 'Management IP', fieldType: 'text', sortOrder: 51, fieldGroup: 'Management' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 52, fieldGroup: 'Management' },
      { fieldName: 'VLAN Support', fieldType: 'boolean', sortOrder: 60, fieldGroup: 'Features' },
      { fieldName: 'Band Steering', fieldType: 'boolean', sortOrder: 61, fieldGroup: 'Features' },
      { fieldName: 'Mesh Support', fieldType: 'boolean', sortOrder: 62, fieldGroup: 'Features' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Firewall',
    description: 'Network firewalls and security appliances',
    icon: 'mdi:firewall',
    iconColor: '#ef4444',
    iconBackgroundColor: '#7f1d1d',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Fortinet', 'Palo Alto', 'Cisco', 'SonicWall', 'Sophos', 'WatchGuard', 'pfSense', 'OPNsense', 'Ubiquiti', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Firewall Throughput', fieldType: 'unit', unitType: 'datarate', unitOptions: ['Mbps', 'Gbps'], sortOrder: 10, fieldGroup: 'Performance' },
      { fieldName: 'VPN Throughput', fieldType: 'unit', unitType: 'datarate', unitOptions: ['Mbps', 'Gbps'], sortOrder: 11, fieldGroup: 'Performance' },
      { fieldName: 'IPS Throughput', fieldType: 'unit', unitType: 'datarate', unitOptions: ['Mbps', 'Gbps'], sortOrder: 12, fieldGroup: 'Performance' },
      { fieldName: 'Concurrent Sessions', fieldType: 'number', sortOrder: 13, fieldGroup: 'Performance' },
      { fieldName: 'New Sessions/sec', fieldType: 'number', sortOrder: 14, fieldGroup: 'Performance' },
      { fieldName: 'WAN Ports', fieldType: 'number', sortOrder: 20, fieldGroup: 'Interfaces' },
      { fieldName: 'LAN Ports', fieldType: 'number', sortOrder: 21, fieldGroup: 'Interfaces' },
      { fieldName: 'SFP/SFP+ Ports', fieldType: 'number', sortOrder: 22, fieldGroup: 'Interfaces' },
      { fieldName: 'Port Speed', fieldType: 'select', options: ['1Gbps', '2.5Gbps', '10Gbps', 'Mixed'], sortOrder: 23, fieldGroup: 'Interfaces' },
      { fieldName: 'SSL VPN Users', fieldType: 'number', sortOrder: 30, fieldGroup: 'VPN' },
      { fieldName: 'IPSec VPN Tunnels', fieldType: 'number', sortOrder: 31, fieldGroup: 'VPN' },
      { fieldName: 'SD-WAN', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'IPS/IDS', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Web Filtering', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Features' },
      { fieldName: 'Antivirus', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Features' },
      { fieldName: 'Sandboxing', fieldType: 'boolean', sortOrder: 44, fieldGroup: 'Features' },
      { fieldName: 'License Type', fieldType: 'text', sortOrder: 50, fieldGroup: 'Licensing' },
      { fieldName: 'License Expiry', fieldType: 'date', sortOrder: 51, fieldGroup: 'Licensing' },
      { fieldName: 'Management IP', fieldType: 'text', sortOrder: 60, fieldGroup: 'Management' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 61, fieldGroup: 'Management' },
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Desktop', 'Rackmount 1U', 'Virtual Appliance'], sortOrder: 70, fieldGroup: 'Physical' },
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 71, fieldGroup: 'Physical' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'NAS',
    description: 'Network Attached Storage devices',
    icon: 'mdi:nas',
    iconColor: '#f97316',
    iconBackgroundColor: '#7c2d12',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Synology', 'QNAP', 'Asustor', 'TerraMaster', 'WD', 'Buffalo', 'Netgear', 'TrueNAS', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Drive Bays', fieldType: 'number', isRequired: true, sortOrder: 10, fieldGroup: 'Storage' },
      { fieldName: 'Max Capacity', fieldType: 'unit', unitType: 'data', unitOptions: ['TB', 'PB'], sortOrder: 11, fieldGroup: 'Storage' },
      { fieldName: 'Installed Capacity', fieldType: 'unit', unitType: 'data', unitOptions: ['TB'], sortOrder: 12, fieldGroup: 'Storage' },
      { fieldName: 'Usable Capacity', fieldType: 'unit', unitType: 'data', unitOptions: ['TB'], sortOrder: 13, fieldGroup: 'Storage' },
      { fieldName: 'RAID Level', fieldType: 'select', options: ['JBOD', 'RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10', 'SHR', 'SHR-2'], sortOrder: 14, fieldGroup: 'Storage' },
      { fieldName: 'M.2/NVMe Slots', fieldType: 'number', sortOrder: 15, fieldGroup: 'Storage' },
      { fieldName: 'CPU', fieldType: 'text', sortOrder: 20, fieldGroup: 'Hardware' },
      { fieldName: 'RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 21, fieldGroup: 'Hardware' },
      { fieldName: 'Max RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 22, fieldGroup: 'Hardware' },
      { fieldName: 'Ethernet Ports', fieldType: 'number', sortOrder: 30, fieldGroup: 'Network' },
      { fieldName: 'Port Speed', fieldType: 'select', options: ['1Gbps', '2.5Gbps', '10Gbps'], sortOrder: 31, fieldGroup: 'Network' },
      { fieldName: 'Link Aggregation', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Network' },
      { fieldName: 'IP Address', fieldType: 'text', sortOrder: 33, fieldGroup: 'Network' },
      { fieldName: 'SMB/CIFS', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Protocols' },
      { fieldName: 'NFS', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Protocols' },
      { fieldName: 'iSCSI', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Protocols' },
      { fieldName: 'AFP', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Protocols' },
      { fieldName: 'OS Version', fieldType: 'text', sortOrder: 50, fieldGroup: 'Software' },
      { fieldName: 'Docker Support', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Software' },
      { fieldName: 'VM Support', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Software' },
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 60, fieldGroup: 'Power' },
      { fieldName: 'UPS Connected', fieldType: 'boolean', sortOrder: 61, fieldGroup: 'Power' }
    ],
    suggests: ['Power Adapter', 'Hard Drive', 'UPS']
  },
  {
    name: 'IP Camera',
    description: 'Network surveillance cameras',
    icon: 'mdi:cctv',
    iconColor: '#84cc16',
    iconBackgroundColor: '#365314',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Hikvision', 'Dahua', 'Axis', 'Ubiquiti', 'Reolink', 'Amcrest', 'Hanwha', 'Vivotek', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Camera Type', fieldType: 'select', options: ['Dome', 'Bullet', 'Turret', 'PTZ', 'Fisheye', 'Box', 'Cube'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Indoor/Outdoor', fieldType: 'select', options: ['Indoor', 'Outdoor', 'Both'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Resolution', fieldType: 'select', options: ['1080p (2MP)', '2K (4MP)', '4K (8MP)', '5MP', '6MP', '12MP'], sortOrder: 20, fieldGroup: 'Image' },
      { fieldName: 'Sensor Size', fieldType: 'text', sortOrder: 21, fieldGroup: 'Image', placeholder: 'e.g., 1/2.8"' },
      { fieldName: 'Lens Type', fieldType: 'select', options: ['Fixed', 'Varifocal', 'Motorized Zoom'], sortOrder: 22, fieldGroup: 'Image' },
      { fieldName: 'Focal Length', fieldType: 'text', sortOrder: 23, fieldGroup: 'Image', placeholder: 'e.g., 2.8mm or 2.8-12mm' },
      { fieldName: 'Field of View', fieldType: 'text', sortOrder: 24, fieldGroup: 'Image', placeholder: 'e.g., 110°' },
      { fieldName: 'Night Vision', fieldType: 'select', options: ['None', 'IR LEDs', 'Starlight', 'ColorVu', 'Dual Light'], sortOrder: 30, fieldGroup: 'Night Vision' },
      { fieldName: 'IR Range', fieldType: 'unit', unitType: 'length', unitOptions: ['m', 'ft'], sortOrder: 31, fieldGroup: 'Night Vision' },
      { fieldName: 'PoE Standard', fieldType: 'select', options: ['802.3af', '802.3at', '802.3bt', 'None'], sortOrder: 40, fieldGroup: 'Power' },
      { fieldName: 'Power Consumption', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 41, fieldGroup: 'Power' },
      { fieldName: 'IP Address', fieldType: 'text', sortOrder: 50, fieldGroup: 'Network' },
      { fieldName: 'RTSP', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Network' },
      { fieldName: 'ONVIF', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Network' },
      { fieldName: 'SD Card Slot', fieldType: 'boolean', sortOrder: 60, fieldGroup: 'Storage' },
      { fieldName: 'Max SD Card', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 61, fieldGroup: 'Storage' },
      { fieldName: 'Motion Detection', fieldType: 'boolean', sortOrder: 70, fieldGroup: 'Features' },
      { fieldName: 'AI Detection', fieldType: 'boolean', sortOrder: 71, fieldGroup: 'Features', helpText: 'Person/Vehicle detection' },
      { fieldName: 'Two-Way Audio', fieldType: 'boolean', sortOrder: 72, fieldGroup: 'Features' },
      { fieldName: 'IP Rating', fieldType: 'text', sortOrder: 80, fieldGroup: 'Physical', placeholder: 'e.g., IP67' },
      { fieldName: 'Vandal Proof', fieldType: 'boolean', sortOrder: 81, fieldGroup: 'Physical' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 90, fieldGroup: 'Software' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'VoIP Phone',
    description: 'IP phones and desk phones',
    icon: 'mdi:phone-voip',
    iconColor: '#a3e635',
    iconBackgroundColor: '#3f6212',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Cisco', 'Polycom', 'Yealink', 'Grandstream', 'Avaya', 'Mitel', 'Snom', 'Fanvil', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'MAC Address', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Phone Type', fieldType: 'select', options: ['Basic', 'Executive', 'Conference', 'Receptionist', 'Wireless/DECT'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Lines/Accounts', fieldType: 'number', sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Display Type', fieldType: 'select', options: ['None', 'Segment LCD', 'Grayscale LCD', 'Color LCD', 'Color Touchscreen'], sortOrder: 20, fieldGroup: 'Display' },
      { fieldName: 'Display Size', fieldType: 'text', sortOrder: 21, fieldGroup: 'Display' },
      { fieldName: 'Programmable Keys', fieldType: 'number', sortOrder: 30, fieldGroup: 'Features' },
      { fieldName: 'Expansion Module', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Features' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Features' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Features' },
      { fieldName: 'USB Port', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Features' },
      { fieldName: 'Headset Port', fieldType: 'select', options: ['None', 'RJ9', '3.5mm', 'USB'], sortOrder: 35, fieldGroup: 'Features' },
      { fieldName: 'PoE', fieldType: 'select', options: ['None', '802.3af', '802.3at'], sortOrder: 40, fieldGroup: 'Power' },
      { fieldName: 'Ethernet Ports', fieldType: 'number', sortOrder: 50, fieldGroup: 'Network' },
      { fieldName: 'Gigabit Ports', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Network' },
      { fieldName: 'IP Address', fieldType: 'text', sortOrder: 52, fieldGroup: 'Network' },
      { fieldName: 'SIP', fieldType: 'boolean', sortOrder: 60, fieldGroup: 'Protocols' },
      { fieldName: 'H.323', fieldType: 'boolean', sortOrder: 61, fieldGroup: 'Protocols' },
      { fieldName: 'HD Voice', fieldType: 'boolean', sortOrder: 70, fieldGroup: 'Audio' },
      { fieldName: 'Speakerphone', fieldType: 'boolean', sortOrder: 71, fieldGroup: 'Audio' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 80, fieldGroup: 'Software' },
      { fieldName: 'Provisioning', fieldType: 'select', options: ['Manual', 'DHCP Option 66', 'Cloud', 'Zero Touch'], sortOrder: 81, fieldGroup: 'Software' }
    ],
    suggests: ['Power Adapter', 'Headset']
  },
  // ==================== COMPUTER COMPONENTS ====================
  {
    name: 'Power Supply',
    description: 'Desktop power supply units (PSUs)',
    icon: 'mdi:lightning-bolt',
    iconColor: '#facc15',
    iconBackgroundColor: '#713f12',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Corsair', 'EVGA', 'Seasonic', 'be quiet!', 'Thermaltake', 'Cooler Master', 'NZXT', 'MSI', 'ASUS', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Wattage', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], isRequired: true, sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Efficiency Rating', fieldType: 'select', options: ['80 PLUS', '80 PLUS Bronze', '80 PLUS Silver', '80 PLUS Gold', '80 PLUS Platinum', '80 PLUS Titanium'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Modularity', fieldType: 'select', options: ['Non-Modular', 'Semi-Modular', 'Fully Modular'], sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'Form Factor', fieldType: 'select', options: ['ATX', 'SFX', 'SFX-L', 'TFX', 'Flex ATX'], sortOrder: 13, fieldGroup: 'Specs' },
      { fieldName: 'Fan Size', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 20, fieldGroup: 'Cooling' },
      { fieldName: 'Fan Bearing', fieldType: 'select', options: ['Sleeve', 'Rifle', 'Fluid Dynamic', 'Ball Bearing'], sortOrder: 21, fieldGroup: 'Cooling' },
      { fieldName: 'Zero RPM Mode', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Cooling' },
      { fieldName: '24-Pin ATX', fieldType: 'number', sortOrder: 30, fieldGroup: 'Connectors' },
      { fieldName: '8-Pin EPS/CPU', fieldType: 'number', sortOrder: 31, fieldGroup: 'Connectors' },
      { fieldName: '8-Pin PCIe', fieldType: 'number', sortOrder: 32, fieldGroup: 'Connectors' },
      { fieldName: '12VHPWR (16-Pin)', fieldType: 'number', sortOrder: 33, fieldGroup: 'Connectors' },
      { fieldName: 'SATA', fieldType: 'number', sortOrder: 34, fieldGroup: 'Connectors' },
      { fieldName: 'Molex', fieldType: 'number', sortOrder: 35, fieldGroup: 'Connectors' },
      { fieldName: '+12V Rail Design', fieldType: 'select', options: ['Single Rail', 'Multi Rail'], sortOrder: 40, fieldGroup: 'Rails' },
      { fieldName: '+12V Output', fieldType: 'unit', unitType: 'amperage', unitOptions: ['A'], sortOrder: 41, fieldGroup: 'Rails' },
      { fieldName: 'Input Voltage', fieldType: 'text', sortOrder: 50, fieldGroup: 'Input', placeholder: '100-240V' },
      { fieldName: 'Dimensions', fieldType: 'text', sortOrder: 60, fieldGroup: 'Physical', placeholder: 'L x W x H mm' },
      { fieldName: 'Cable Type', fieldType: 'select', options: ['Flat/Ribbon', 'Sleeved', 'Paracord'], sortOrder: 61, fieldGroup: 'Physical' },
      { fieldName: 'Warranty', fieldType: 'select', options: ['3 Years', '5 Years', '7 Years', '10 Years', '12 Years'], sortOrder: 70, fieldGroup: 'Warranty' }
    ]
  },
  {
    name: 'Computer Case',
    description: 'Desktop and server chassis',
    icon: 'mdi:desktop-tower-monitor',
    iconColor: '#71717a',
    iconBackgroundColor: '#27272a',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Corsair', 'NZXT', 'Lian Li', 'Fractal Design', 'Phanteks', 'be quiet!', 'Cooler Master', 'Thermaltake', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Color', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Full Tower', 'Mid Tower', 'Mini Tower', 'SFF', 'HTPC', 'Open Frame'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Motherboard Support', fieldType: 'select', options: ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX', 'Multiple'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'PSU Form Factor', fieldType: 'select', options: ['ATX', 'SFX', 'SFX-L'], sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'Max GPU Length', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 20, fieldGroup: 'Clearance' },
      { fieldName: 'Max CPU Cooler Height', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 21, fieldGroup: 'Clearance' },
      { fieldName: 'Max PSU Length', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 22, fieldGroup: 'Clearance' },
      { fieldName: '3.5" Bays', fieldType: 'number', sortOrder: 30, fieldGroup: 'Drive Bays' },
      { fieldName: '2.5" Bays', fieldType: 'number', sortOrder: 31, fieldGroup: 'Drive Bays' },
      { fieldName: '5.25" Bays', fieldType: 'number', sortOrder: 32, fieldGroup: 'Drive Bays' },
      { fieldName: 'Expansion Slots', fieldType: 'number', sortOrder: 33, fieldGroup: 'Drive Bays' },
      { fieldName: 'Front Fan Mounts', fieldType: 'text', sortOrder: 40, fieldGroup: 'Cooling', placeholder: 'e.g., 3x 120mm or 2x 140mm' },
      { fieldName: 'Top Fan Mounts', fieldType: 'text', sortOrder: 41, fieldGroup: 'Cooling' },
      { fieldName: 'Rear Fan Mounts', fieldType: 'text', sortOrder: 42, fieldGroup: 'Cooling' },
      { fieldName: 'Included Fans', fieldType: 'text', sortOrder: 43, fieldGroup: 'Cooling' },
      { fieldName: 'Max Radiator Support', fieldType: 'text', sortOrder: 44, fieldGroup: 'Cooling', placeholder: 'e.g., 360mm front, 240mm top' },
      { fieldName: 'Front I/O', fieldType: 'text', sortOrder: 50, fieldGroup: 'Front Panel', placeholder: 'e.g., 2x USB 3.0, 1x USB-C, Audio' },
      { fieldName: 'Side Panel', fieldType: 'select', options: ['Solid', 'Tempered Glass', 'Acrylic', 'Mesh'], sortOrder: 51, fieldGroup: 'Front Panel' },
      { fieldName: 'Dimensions', fieldType: 'text', sortOrder: 60, fieldGroup: 'Physical', placeholder: 'L x W x H mm' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['kg', 'lb'], sortOrder: 61, fieldGroup: 'Physical' },
      { fieldName: 'Dust Filters', fieldType: 'boolean', sortOrder: 70, fieldGroup: 'Features' },
      { fieldName: 'Tool-less Design', fieldType: 'boolean', sortOrder: 71, fieldGroup: 'Features' }
    ]
  },
  {
    name: 'Network Interface Card',
    description: 'Add-in network adapters (NICs)',
    icon: 'mdi:expansion-card-variant',
    iconColor: '#14b8a6',
    iconBackgroundColor: '#134e4a',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Intel', 'Broadcom', 'Mellanox', 'Chelsio', 'Realtek', 'Aquantia', 'TP-Link', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'MAC Address', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Interface Type', fieldType: 'select', options: ['Ethernet', 'Fiber (SFP)', 'Fiber (SFP+)', 'Fiber (QSFP+)', 'InfiniBand'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Port Speed', fieldType: 'select', options: ['1Gbps', '2.5Gbps', '5Gbps', '10Gbps', '25Gbps', '40Gbps', '100Gbps'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Number of Ports', fieldType: 'number', sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'Connector Type', fieldType: 'select', options: ['RJ-45', 'SFP', 'SFP+', 'SFP28', 'QSFP+', 'QSFP28'], sortOrder: 13, fieldGroup: 'Specs' },
      { fieldName: 'PCIe Version', fieldType: 'select', options: ['PCIe 2.0', 'PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'], sortOrder: 20, fieldGroup: 'Interface' },
      { fieldName: 'PCIe Lanes', fieldType: 'select', options: ['x1', 'x4', 'x8', 'x16'], sortOrder: 21, fieldGroup: 'Interface' },
      { fieldName: 'Chipset', fieldType: 'text', sortOrder: 30, fieldGroup: 'Hardware' },
      { fieldName: 'TCP/IP Offload', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'RDMA', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'SR-IOV', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Features' },
      { fieldName: 'iSCSI Boot', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Features' },
      { fieldName: 'Wake-on-LAN', fieldType: 'boolean', sortOrder: 44, fieldGroup: 'Features' },
      { fieldName: 'Low Profile Bracket', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Physical' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Not Tested', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ]
  },
  {
    name: 'RAID Controller',
    description: 'Hardware RAID controllers',
    icon: 'mdi:harddisk-plus',
    iconColor: '#8b5cf6',
    iconBackgroundColor: '#4c1d95',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Broadcom/LSI', 'Adaptec', 'Dell PERC', 'HP Smart Array', 'Areca', 'HighPoint', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Interface', fieldType: 'select', options: ['SAS', 'SATA', 'NVMe', 'SAS/SATA'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Port Count', fieldType: 'number', sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Max Drives', fieldType: 'number', sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'Data Transfer Rate', fieldType: 'select', options: ['3Gbps', '6Gbps', '12Gbps', '24Gbps'], sortOrder: 13, fieldGroup: 'Specs' },
      { fieldName: 'RAID Levels', fieldType: 'text', sortOrder: 14, fieldGroup: 'Specs', placeholder: 'e.g., 0, 1, 5, 6, 10, 50, 60' },
      { fieldName: 'Cache Memory', fieldType: 'unit', unitType: 'data', unitOptions: ['MB', 'GB'], sortOrder: 20, fieldGroup: 'Cache' },
      { fieldName: 'Cache Type', fieldType: 'select', options: ['DDR3', 'DDR4', 'Flash'], sortOrder: 21, fieldGroup: 'Cache' },
      { fieldName: 'Battery Backup', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Cache' },
      { fieldName: 'Flash Backup', fieldType: 'boolean', sortOrder: 23, fieldGroup: 'Cache' },
      { fieldName: 'PCIe Version', fieldType: 'select', options: ['PCIe 2.0', 'PCIe 3.0', 'PCIe 4.0'], sortOrder: 30, fieldGroup: 'Interface' },
      { fieldName: 'PCIe Lanes', fieldType: 'select', options: ['x4', 'x8', 'x16'], sortOrder: 31, fieldGroup: 'Interface' },
      { fieldName: 'Internal Connectors', fieldType: 'text', sortOrder: 40, fieldGroup: 'Connectors', placeholder: 'e.g., 2x SFF-8643' },
      { fieldName: 'External Connectors', fieldType: 'text', sortOrder: 41, fieldGroup: 'Connectors', placeholder: 'e.g., 2x SFF-8644' },
      { fieldName: 'Firmware Version', fieldType: 'text', sortOrder: 50, fieldGroup: 'Software' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Not Tested', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ]
  },
  {
    name: 'Optical Drive',
    description: 'CD, DVD, and Blu-ray drives',
    icon: 'mdi:disc',
    iconColor: '#d946ef',
    iconBackgroundColor: '#701a75',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['LG', 'ASUS', 'Pioneer', 'Samsung', 'Lite-On', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Drive Type', fieldType: 'select', options: ['CD-ROM', 'CD-RW', 'DVD-ROM', 'DVD Writer', 'BD-ROM', 'BD Writer', 'UHD BD'], isRequired: true, sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Interface', fieldType: 'select', options: ['SATA', 'USB 2.0', 'USB 3.0', 'IDE'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Form Factor', fieldType: 'select', options: ['5.25" Internal', 'Slim Internal', 'External Portable', 'External Desktop'], sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'CD Read Speed', fieldType: 'text', sortOrder: 20, fieldGroup: 'Speeds', placeholder: 'e.g., 48x' },
      { fieldName: 'CD Write Speed', fieldType: 'text', sortOrder: 21, fieldGroup: 'Speeds' },
      { fieldName: 'DVD Read Speed', fieldType: 'text', sortOrder: 22, fieldGroup: 'Speeds', placeholder: 'e.g., 16x' },
      { fieldName: 'DVD Write Speed', fieldType: 'text', sortOrder: 23, fieldGroup: 'Speeds' },
      { fieldName: 'BD Read Speed', fieldType: 'text', sortOrder: 24, fieldGroup: 'Speeds' },
      { fieldName: 'BD Write Speed', fieldType: 'text', sortOrder: 25, fieldGroup: 'Speeds' },
      { fieldName: 'M-DISC Support', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Features' },
      { fieldName: 'Buffer Size', fieldType: 'unit', unitType: 'data', unitOptions: ['MB'], sortOrder: 31, fieldGroup: 'Features' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Not Tested', 'Defective'], sortOrder: 40, fieldGroup: 'Status' }
    ]
  },
  // ==================== PERIPHERALS ====================
  {
    name: 'Keyboard',
    description: 'Computer keyboards',
    icon: 'mdi:keyboard',
    iconColor: '#94a3b8',
    iconBackgroundColor: '#334155',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Logitech', 'Corsair', 'Razer', 'SteelSeries', 'HyperX', 'Ducky', 'Keychron', 'Das Keyboard', 'Microsoft', 'Apple', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Keyboard Type', fieldType: 'select', options: ['Mechanical', 'Membrane', 'Scissor', 'Optical', 'Topre'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Full Size (100%)', 'TKL (80%)', '75%', '65%', '60%', '40%', 'Ergonomic'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Switch Type', fieldType: 'text', sortOrder: 12, fieldGroup: 'Type', placeholder: 'e.g., Cherry MX Red, Gateron Brown' },
      { fieldName: 'Layout', fieldType: 'select', options: ['ANSI', 'ISO', 'JIS'], sortOrder: 20, fieldGroup: 'Layout' },
      { fieldName: 'Language', fieldType: 'text', sortOrder: 21, fieldGroup: 'Layout', placeholder: 'e.g., US English, UK, German' },
      { fieldName: 'Connectivity', fieldType: 'select', options: ['Wired USB', 'Wireless 2.4GHz', 'Bluetooth', 'Multi-Mode'], sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'Cable Type', fieldType: 'select', options: ['Fixed', 'Detachable USB-C', 'Detachable Micro USB', 'Detachable Mini USB'], sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'Backlight', fieldType: 'select', options: ['None', 'Single Color', 'RGB', 'Per-Key RGB'], sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Hot-Swappable', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'N-Key Rollover', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Features' },
      { fieldName: 'Media Keys', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Features' },
      { fieldName: 'Wrist Rest', fieldType: 'boolean', sortOrder: 44, fieldGroup: 'Features' },
      { fieldName: 'Software', fieldType: 'text', sortOrder: 50, fieldGroup: 'Software', placeholder: 'e.g., Logitech G Hub, Razer Synapse' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Sticky Keys', 'Missing Keycaps', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ]
  },
  {
    name: 'Mouse',
    description: 'Computer mice and pointing devices',
    icon: 'mdi:mouse',
    iconColor: '#a78bfa',
    iconBackgroundColor: '#4c1d95',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Logitech', 'Razer', 'Corsair', 'SteelSeries', 'Zowie', 'Finalmouse', 'Glorious', 'Microsoft', 'Apple', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Mouse Type', fieldType: 'select', options: ['Standard', 'Gaming', 'Ergonomic', 'Vertical', 'Trackball', 'Travel'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Grip Style', fieldType: 'select', options: ['Ambidextrous', 'Right-Handed', 'Left-Handed', 'Ergonomic'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Sensor Type', fieldType: 'select', options: ['Optical', 'Laser', 'Hero', 'Focus+', 'PAW3395'], sortOrder: 20, fieldGroup: 'Sensor' },
      { fieldName: 'Max DPI', fieldType: 'number', sortOrder: 21, fieldGroup: 'Sensor' },
      { fieldName: 'Polling Rate', fieldType: 'select', options: ['125Hz', '500Hz', '1000Hz', '2000Hz', '4000Hz', '8000Hz'], sortOrder: 22, fieldGroup: 'Sensor' },
      { fieldName: 'Connectivity', fieldType: 'select', options: ['Wired USB', 'Wireless 2.4GHz', 'Bluetooth', 'Multi-Mode'], sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'Cable Type', fieldType: 'select', options: ['Rubber', 'Braided', 'Paracord'], sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'Button Count', fieldType: 'number', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Programmable Buttons', fieldType: 'number', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Scroll Wheel', fieldType: 'select', options: ['Standard', 'Tilt', 'Infinite/Free Spin', 'MagSpeed'], sortOrder: 42, fieldGroup: 'Features' },
      { fieldName: 'RGB Lighting', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Features' },
      { fieldName: 'Onboard Memory', fieldType: 'boolean', sortOrder: 44, fieldGroup: 'Features' },
      { fieldName: 'Weight', fieldType: 'unit', unitType: 'weight', unitOptions: ['g'], sortOrder: 50, fieldGroup: 'Physical' },
      { fieldName: 'Adjustable Weight', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Physical' },
      { fieldName: 'Battery Life', fieldType: 'text', sortOrder: 60, fieldGroup: 'Battery', placeholder: 'e.g., 70 hours' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Double Click Issue', 'Scroll Wheel Issue', 'Defective'], sortOrder: 70, fieldGroup: 'Status' }
    ]
  },
  {
    name: 'Webcam',
    description: 'External webcams and cameras',
    icon: 'mdi:webcam',
    iconColor: '#f43f5e',
    iconBackgroundColor: '#881337',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Logitech', 'Razer', 'Elgato', 'Microsoft', 'AVerMedia', 'OBSBOT', 'Insta360', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Resolution', fieldType: 'select', options: ['720p', '1080p', '2K', '4K'], sortOrder: 10, fieldGroup: 'Video' },
      { fieldName: 'Max Frame Rate', fieldType: 'select', options: ['30fps', '60fps', '90fps', '120fps'], sortOrder: 11, fieldGroup: 'Video' },
      { fieldName: 'HDR Support', fieldType: 'boolean', sortOrder: 12, fieldGroup: 'Video' },
      { fieldName: 'Field of View', fieldType: 'text', sortOrder: 13, fieldGroup: 'Video', placeholder: 'e.g., 78°, 90°' },
      { fieldName: 'Autofocus', fieldType: 'boolean', sortOrder: 20, fieldGroup: 'Features' },
      { fieldName: 'Auto Light Correction', fieldType: 'boolean', sortOrder: 21, fieldGroup: 'Features' },
      { fieldName: 'Background Blur', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Features' },
      { fieldName: 'Pan/Tilt/Zoom', fieldType: 'boolean', sortOrder: 23, fieldGroup: 'Features' },
      { fieldName: 'AI Tracking', fieldType: 'boolean', sortOrder: 24, fieldGroup: 'Features' },
      { fieldName: 'Built-in Microphone', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Audio' },
      { fieldName: 'Microphone Type', fieldType: 'select', options: ['Mono', 'Stereo', 'Dual Omnidirectional'], sortOrder: 31, fieldGroup: 'Audio' },
      { fieldName: 'Noise Cancellation', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Audio' },
      { fieldName: 'Connection', fieldType: 'select', options: ['USB-A', 'USB-C', 'Wireless'], sortOrder: 40, fieldGroup: 'Connectivity' },
      { fieldName: 'Mount Type', fieldType: 'select', options: ['Clip Mount', 'Tripod Mount', 'Monitor Mount'], sortOrder: 50, fieldGroup: 'Physical' },
      { fieldName: 'Privacy Shutter', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Physical' },
      { fieldName: 'Ring Light', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Physical' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Focus Issue', 'Mic Issue', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ]
  },
  {
    name: 'Headset',
    description: 'Headphones and headsets',
    icon: 'mdi:headset',
    iconColor: '#06b6d4',
    iconBackgroundColor: '#164e63',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Sony', 'Bose', 'Sennheiser', 'Audio-Technica', 'SteelSeries', 'HyperX', 'Logitech', 'Razer', 'Corsair', 'Jabra', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Type', fieldType: 'select', options: ['Over-Ear', 'On-Ear', 'In-Ear', 'Earbuds'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Use Case', fieldType: 'select', options: ['Gaming', 'Music', 'Office/Call Center', 'Studio/Professional', 'General'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Open/Closed Back', fieldType: 'select', options: ['Closed-Back', 'Open-Back', 'Semi-Open'], sortOrder: 12, fieldGroup: 'Type' },
      { fieldName: 'Driver Size', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 20, fieldGroup: 'Audio' },
      { fieldName: 'Frequency Response', fieldType: 'text', sortOrder: 21, fieldGroup: 'Audio', placeholder: 'e.g., 20Hz - 20kHz' },
      { fieldName: 'Impedance', fieldType: 'unit', unitType: 'resistance', unitOptions: ['Ω'], sortOrder: 22, fieldGroup: 'Audio' },
      { fieldName: 'Surround Sound', fieldType: 'select', options: ['Stereo', '7.1 Virtual', '7.1 True'], sortOrder: 23, fieldGroup: 'Audio' },
      { fieldName: 'ANC', fieldType: 'boolean', sortOrder: 24, fieldGroup: 'Audio', helpText: 'Active Noise Cancellation' },
      { fieldName: 'Microphone', fieldType: 'select', options: ['None', 'Built-in', 'Boom Mic', 'Detachable Boom'], sortOrder: 30, fieldGroup: 'Microphone' },
      { fieldName: 'Mic Noise Cancellation', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Microphone' },
      { fieldName: 'Mic Mute', fieldType: 'select', options: ['None', 'Button', 'Flip-to-Mute', 'Software'], sortOrder: 32, fieldGroup: 'Microphone' },
      { fieldName: 'Connectivity', fieldType: 'select', options: ['Wired 3.5mm', 'Wired USB', 'Wireless 2.4GHz', 'Bluetooth', 'Multi-Mode'], sortOrder: 40, fieldGroup: 'Connectivity' },
      { fieldName: 'Battery Life', fieldType: 'text', sortOrder: 50, fieldGroup: 'Battery', placeholder: 'e.g., 30 hours' },
      { fieldName: 'RGB Lighting', fieldType: 'boolean', sortOrder: 60, fieldGroup: 'Features' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Audio Issue', 'Mic Issue', 'Battery Issue', 'Defective'], sortOrder: 70, fieldGroup: 'Status' }
    ]
  },
  {
    name: 'Docking Station',
    description: 'Laptop docks and port replicators',
    icon: 'mdi:dock-bottom',
    iconColor: '#3b82f6',
    iconBackgroundColor: '#1e3a8a',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Dell', 'Lenovo', 'HP', 'CalDigit', 'Plugable', 'Anker', 'Belkin', 'Kensington', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Dock Type', fieldType: 'select', options: ['USB-C/Thunderbolt', 'USB-A', 'Proprietary'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Thunderbolt Version', fieldType: 'select', options: ['N/A', 'TB3', 'TB4'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Power Delivery', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 20, fieldGroup: 'Power' },
      { fieldName: 'External Power Required', fieldType: 'boolean', sortOrder: 21, fieldGroup: 'Power' },
      { fieldName: 'USB-A Ports', fieldType: 'number', sortOrder: 30, fieldGroup: 'Ports' },
      { fieldName: 'USB-C Ports', fieldType: 'number', sortOrder: 31, fieldGroup: 'Ports' },
      { fieldName: 'HDMI Ports', fieldType: 'number', sortOrder: 32, fieldGroup: 'Ports' },
      { fieldName: 'DisplayPort', fieldType: 'number', sortOrder: 33, fieldGroup: 'Ports' },
      { fieldName: 'Ethernet', fieldType: 'select', options: ['None', '100Mbps', '1Gbps', '2.5Gbps'], sortOrder: 34, fieldGroup: 'Ports' },
      { fieldName: 'SD Card Reader', fieldType: 'boolean', sortOrder: 35, fieldGroup: 'Ports' },
      { fieldName: 'Audio Jack', fieldType: 'boolean', sortOrder: 36, fieldGroup: 'Ports' },
      { fieldName: 'Max Displays', fieldType: 'number', sortOrder: 40, fieldGroup: 'Display' },
      { fieldName: 'Max Resolution', fieldType: 'text', sortOrder: 41, fieldGroup: 'Display', placeholder: 'e.g., 4K@60Hz, 8K@30Hz' },
      { fieldName: 'MST Support', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Display' },
      { fieldName: 'Compatible Laptops', fieldType: 'text', sortOrder: 50, fieldGroup: 'Compatibility', helpText: 'Specific models or brands' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Port Issue', 'Display Issue', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'KVM Switch',
    description: 'Keyboard/Video/Mouse switches',
    icon: 'mdi:monitor-multiple',
    iconColor: '#10b981',
    iconBackgroundColor: '#064e3b',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['ATEN', 'StarTech', 'TRENDnet', 'IOGEAR', 'Black Box', 'Raritan', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Port Count', fieldType: 'select', options: ['2', '4', '8', '16', '32'], isRequired: true, sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Video Type', fieldType: 'select', options: ['VGA', 'DVI', 'HDMI', 'DisplayPort', 'USB-C', 'Mixed'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Max Resolution', fieldType: 'text', sortOrder: 12, fieldGroup: 'Specs', placeholder: 'e.g., 4K@60Hz' },
      { fieldName: 'Multi-Monitor', fieldType: 'select', options: ['Single', 'Dual', 'Quad'], sortOrder: 13, fieldGroup: 'Specs' },
      { fieldName: 'USB Version', fieldType: 'select', options: ['USB 2.0', 'USB 3.0', 'USB 3.2'], sortOrder: 20, fieldGroup: 'USB' },
      { fieldName: 'USB Hub Ports', fieldType: 'number', sortOrder: 21, fieldGroup: 'USB' },
      { fieldName: 'Audio Support', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Features' },
      { fieldName: 'Hotkey Switching', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Features' },
      { fieldName: 'Front Panel Buttons', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Features' },
      { fieldName: 'Remote Control', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Features' },
      { fieldName: 'IP/Network KVM', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Features' },
      { fieldName: 'Rackmount', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Physical' },
      { fieldName: 'Cables Included', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Included' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Video Issue', 'USB Issue', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ],
    suggests: ['Cable']
  },
  {
    name: 'USB Hub',
    description: 'USB port expanders and hubs',
    icon: 'mdi:usb-port',
    iconColor: '#64748b',
    iconBackgroundColor: '#1e293b',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Anker', 'Sabrent', 'Plugable', 'CalDigit', 'Belkin', 'TP-Link', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'USB Standard', fieldType: 'select', options: ['USB 2.0', 'USB 3.0', 'USB 3.1', 'USB 3.2', 'USB4'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Port Count', fieldType: 'number', isRequired: true, sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'USB-A Ports', fieldType: 'number', sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'USB-C Ports', fieldType: 'number', sortOrder: 13, fieldGroup: 'Specs' },
      { fieldName: 'Upstream Connection', fieldType: 'select', options: ['USB-A', 'USB-C', 'Thunderbolt'], sortOrder: 20, fieldGroup: 'Connection' },
      { fieldName: 'Cable Length', fieldType: 'unit', unitType: 'length', unitOptions: ['ft', 'm'], sortOrder: 21, fieldGroup: 'Connection' },
      { fieldName: 'Powered', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Power' },
      { fieldName: 'Power Adapter Included', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Power' },
      { fieldName: 'BC 1.2 Charging', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Power' },
      { fieldName: 'Per-Port Charging', fieldType: 'text', sortOrder: 33, fieldGroup: 'Power', placeholder: 'e.g., 2.4A per port' },
      { fieldName: 'Individual Switches', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'LED Indicators', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Desktop', 'Clip-On', 'In-Desk', 'Travel'], sortOrder: 50, fieldGroup: 'Physical' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Port Issue', 'Power Issue', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'External Drive',
    description: 'Portable HDDs and SSDs',
    icon: 'mdi:harddisk',
    iconColor: '#f59e0b',
    iconBackgroundColor: '#78350f',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Samsung', 'SanDisk', 'WD', 'Seagate', 'LaCie', 'Crucial', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Drive Type', fieldType: 'select', options: ['Portable HDD', 'Portable SSD', 'Desktop HDD', 'Desktop SSD'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Capacity', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], isRequired: true, sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Interface', fieldType: 'select', options: ['USB 3.0', 'USB 3.1', 'USB 3.2', 'Thunderbolt 3', 'USB-C'], sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'Read Speed', fieldType: 'unit', unitType: 'datarate', unitOptions: ['MB/s', 'GB/s'], sortOrder: 20, fieldGroup: 'Performance' },
      { fieldName: 'Write Speed', fieldType: 'unit', unitType: 'datarate', unitOptions: ['MB/s', 'GB/s'], sortOrder: 21, fieldGroup: 'Performance' },
      { fieldName: 'Hardware Encryption', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Security' },
      { fieldName: 'Password Protection', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Security' },
      { fieldName: 'Shock Resistant', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Durability' },
      { fieldName: 'Water Resistant', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Durability' },
      { fieldName: 'IP Rating', fieldType: 'text', sortOrder: 42, fieldGroup: 'Durability' },
      { fieldName: 'Cable Included', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Included' },
      { fieldName: 'Health Status', fieldType: 'select', options: ['Healthy', 'Warning', 'Critical', 'Unknown'], sortOrder: 60, fieldGroup: 'Status' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Slow', 'Clicking', 'Not Detected', 'Defective'], sortOrder: 61, fieldGroup: 'Status' }
    ]
  },
  // ==================== MOBILE & TABLETS ====================
  {
    name: 'Smartphone',
    description: 'Mobile phones',
    icon: 'mdi:cellphone',
    iconColor: '#8b5cf6',
    iconBackgroundColor: '#4c1d95',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Motorola', 'Sony', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'IMEI', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Color', fieldType: 'text', sortOrder: 5, fieldGroup: 'General' },
      { fieldName: 'Operating System', fieldType: 'select', options: ['iOS', 'Android', 'Other'], sortOrder: 10, fieldGroup: 'Software' },
      { fieldName: 'OS Version', fieldType: 'text', sortOrder: 11, fieldGroup: 'Software' },
      { fieldName: 'Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 20, fieldGroup: 'Specs' },
      { fieldName: 'RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 21, fieldGroup: 'Specs' },
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['in'], sortOrder: 30, fieldGroup: 'Display' },
      { fieldName: 'Screen Resolution', fieldType: 'text', sortOrder: 31, fieldGroup: 'Display' },
      { fieldName: 'Refresh Rate', fieldType: 'select', options: ['60Hz', '90Hz', '120Hz', '144Hz'], sortOrder: 32, fieldGroup: 'Display' },
      { fieldName: 'Main Camera', fieldType: 'text', sortOrder: 40, fieldGroup: 'Camera', placeholder: 'e.g., 48MP + 12MP + 12MP' },
      { fieldName: 'Front Camera', fieldType: 'text', sortOrder: 41, fieldGroup: 'Camera' },
      { fieldName: 'Battery Capacity', fieldType: 'unit', unitType: 'capacity', unitOptions: ['mAh'], sortOrder: 50, fieldGroup: 'Battery' },
      { fieldName: 'Fast Charging', fieldType: 'text', sortOrder: 51, fieldGroup: 'Battery', placeholder: 'e.g., 65W' },
      { fieldName: 'Wireless Charging', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Battery' },
      { fieldName: 'Battery Health', fieldType: 'text', sortOrder: 53, fieldGroup: 'Battery', placeholder: 'e.g., 92%' },
      { fieldName: 'Carrier Lock', fieldType: 'select', options: ['Unlocked', 'AT&T', 'Verizon', 'T-Mobile', 'Other'], sortOrder: 60, fieldGroup: 'Network' },
      { fieldName: '5G Support', fieldType: 'boolean', sortOrder: 61, fieldGroup: 'Network' },
      { fieldName: 'SIM Type', fieldType: 'select', options: ['Nano SIM', 'eSIM', 'Dual SIM', 'Dual SIM + eSIM'], sortOrder: 62, fieldGroup: 'Network' },
      { fieldName: 'Cosmetic Condition', fieldType: 'select', options: ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'], sortOrder: 70, fieldGroup: 'Condition' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Screen Issue', 'Battery Issue', 'Defective'], sortOrder: 71, fieldGroup: 'Condition' },
      { fieldName: 'Activation Lock', fieldType: 'boolean', sortOrder: 80, fieldGroup: 'Security' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'Tablet',
    description: 'Tablets and iPad devices',
    icon: 'mdi:tablet',
    iconColor: '#ec4899',
    iconBackgroundColor: '#831843',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Apple', 'Samsung', 'Microsoft', 'Lenovo', 'Amazon', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Color', fieldType: 'text', sortOrder: 4, fieldGroup: 'General' },
      { fieldName: 'Operating System', fieldType: 'select', options: ['iPadOS', 'Android', 'Windows', 'Fire OS'], sortOrder: 10, fieldGroup: 'Software' },
      { fieldName: 'OS Version', fieldType: 'text', sortOrder: 11, fieldGroup: 'Software' },
      { fieldName: 'Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB', 'TB'], sortOrder: 20, fieldGroup: 'Specs' },
      { fieldName: 'RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 21, fieldGroup: 'Specs' },
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['in'], sortOrder: 30, fieldGroup: 'Display' },
      { fieldName: 'Screen Resolution', fieldType: 'text', sortOrder: 31, fieldGroup: 'Display' },
      { fieldName: 'Refresh Rate', fieldType: 'select', options: ['60Hz', '90Hz', '120Hz'], sortOrder: 32, fieldGroup: 'Display' },
      { fieldName: 'Stylus Support', fieldType: 'select', options: ['None', 'Apple Pencil', 'S Pen', 'Surface Pen', 'USI'], sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Keyboard Support', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Cellular', fieldType: 'select', options: ['WiFi Only', 'WiFi + LTE', 'WiFi + 5G'], sortOrder: 50, fieldGroup: 'Connectivity' },
      { fieldName: 'Battery Capacity', fieldType: 'unit', unitType: 'capacity', unitOptions: ['mAh', 'Wh'], sortOrder: 60, fieldGroup: 'Battery' },
      { fieldName: 'Battery Health', fieldType: 'text', sortOrder: 61, fieldGroup: 'Battery' },
      { fieldName: 'Cosmetic Condition', fieldType: 'select', options: ['Like New', 'Excellent', 'Good', 'Fair', 'Poor'], sortOrder: 70, fieldGroup: 'Condition' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Screen Issue', 'Battery Issue', 'Defective'], sortOrder: 71, fieldGroup: 'Condition' },
      { fieldName: 'Activation Lock', fieldType: 'boolean', sortOrder: 80, fieldGroup: 'Security' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'Smartwatch',
    description: 'Smartwatches and wearables',
    icon: 'mdi:watch',
    iconColor: '#14b8a6',
    iconBackgroundColor: '#134e4a',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Apple', 'Samsung', 'Garmin', 'Fitbit', 'Google', 'Amazfit', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Case Size', fieldType: 'unit', unitType: 'length', unitOptions: ['mm'], sortOrder: 10, fieldGroup: 'Physical' },
      { fieldName: 'Case Material', fieldType: 'select', options: ['Aluminum', 'Stainless Steel', 'Titanium', 'Plastic'], sortOrder: 11, fieldGroup: 'Physical' },
      { fieldName: 'Color', fieldType: 'text', sortOrder: 12, fieldGroup: 'Physical' },
      { fieldName: 'Band Type', fieldType: 'text', sortOrder: 13, fieldGroup: 'Physical' },
      { fieldName: 'Display Type', fieldType: 'select', options: ['OLED', 'AMOLED', 'LCD', 'E-Ink'], sortOrder: 20, fieldGroup: 'Display' },
      { fieldName: 'Always-On Display', fieldType: 'boolean', sortOrder: 21, fieldGroup: 'Display' },
      { fieldName: 'Operating System', fieldType: 'select', options: ['watchOS', 'Wear OS', 'Tizen', 'Fitbit OS', 'Proprietary'], sortOrder: 30, fieldGroup: 'Software' },
      { fieldName: 'GPS', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Sensors' },
      { fieldName: 'Heart Rate', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Sensors' },
      { fieldName: 'SpO2', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Sensors' },
      { fieldName: 'ECG', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Sensors' },
      { fieldName: 'Cellular', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Connectivity' },
      { fieldName: 'Water Resistance', fieldType: 'text', sortOrder: 60, fieldGroup: 'Durability', placeholder: 'e.g., 50m, IP68' },
      { fieldName: 'Battery Life', fieldType: 'text', sortOrder: 70, fieldGroup: 'Battery' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Screen Issue', 'Battery Issue', 'Sensor Issue', 'Defective'], sortOrder: 80, fieldGroup: 'Condition' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'E-Reader',
    description: 'E-ink reading devices',
    icon: 'mdi:book-open-page-variant',
    iconColor: '#a3a3a3',
    iconBackgroundColor: '#262626',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Amazon Kindle', 'Kobo', 'Barnes & Noble', 'Onyx Boox', 'PocketBook', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['in'], sortOrder: 10, fieldGroup: 'Display' },
      { fieldName: 'Screen Resolution', fieldType: 'text', sortOrder: 11, fieldGroup: 'Display', placeholder: 'e.g., 300 ppi' },
      { fieldName: 'Display Type', fieldType: 'select', options: ['E-Ink Carta', 'E-Ink Kaleido', 'E-Ink Gallery'], sortOrder: 12, fieldGroup: 'Display' },
      { fieldName: 'Front Light', fieldType: 'boolean', sortOrder: 13, fieldGroup: 'Display' },
      { fieldName: 'Warm Light', fieldType: 'boolean', sortOrder: 14, fieldGroup: 'Display' },
      { fieldName: 'Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 20, fieldGroup: 'Specs' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'Cellular', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Connectivity' },
      { fieldName: 'Audiobook Support', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Note Taking', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Waterproof', fieldType: 'text', sortOrder: 42, fieldGroup: 'Features', placeholder: 'e.g., IPX8' },
      { fieldName: 'Battery Life', fieldType: 'text', sortOrder: 50, fieldGroup: 'Battery', placeholder: 'e.g., 10 weeks' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Screen Issue', 'Battery Issue', 'Defective'], sortOrder: 60, fieldGroup: 'Condition' }
    ],
    suggests: ['Power Adapter']
  },
  // ==================== OFFICE EQUIPMENT ====================
  {
    name: 'Scanner',
    description: 'Document and photo scanners',
    icon: 'mdi:scanner',
    iconColor: '#6366f1',
    iconBackgroundColor: '#312e81',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Epson', 'Canon', 'Fujitsu', 'Brother', 'HP', 'Plustek', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Scanner Type', fieldType: 'select', options: ['Flatbed', 'Sheet-Fed', 'Portable', 'Drum', 'Book Scanner'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Intended Use', fieldType: 'select', options: ['Document', 'Photo', 'Film/Slide', 'Receipt', 'General'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Optical Resolution', fieldType: 'text', sortOrder: 20, fieldGroup: 'Specs', placeholder: 'e.g., 600 dpi, 4800 dpi' },
      { fieldName: 'Color Depth', fieldType: 'text', sortOrder: 21, fieldGroup: 'Specs', placeholder: 'e.g., 48-bit' },
      { fieldName: 'Max Scan Size', fieldType: 'text', sortOrder: 22, fieldGroup: 'Specs', placeholder: 'e.g., A4, Legal, A3' },
      { fieldName: 'ADF Capacity', fieldType: 'number', sortOrder: 30, fieldGroup: 'ADF', helpText: 'Automatic Document Feeder' },
      { fieldName: 'Duplex ADF', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'ADF' },
      { fieldName: 'ADF Speed', fieldType: 'text', sortOrder: 32, fieldGroup: 'ADF', placeholder: 'e.g., 35 ppm' },
      { fieldName: 'USB', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Connectivity' },
      { fieldName: 'Scan to Email', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Features' },
      { fieldName: 'Scan to Cloud', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Features' },
      { fieldName: 'OCR Included', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Features' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'ADF Issue', 'Calibration Needed', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Projector',
    description: 'Business and home projectors',
    icon: 'mdi:projector',
    iconColor: '#f472b6',
    iconBackgroundColor: '#831843',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Epson', 'BenQ', 'Optoma', 'Sony', 'LG', 'ViewSonic', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Technology', fieldType: 'select', options: ['LCD', 'DLP', 'LCoS/SXRD', 'Laser', 'LED'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Native Resolution', fieldType: 'select', options: ['SVGA', 'XGA', 'WXGA', '1080p', '4K'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Brightness', fieldType: 'unit', unitType: 'brightness', unitOptions: ['lumens'], sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'Contrast Ratio', fieldType: 'text', sortOrder: 13, fieldGroup: 'Specs', placeholder: 'e.g., 15000:1' },
      { fieldName: 'Throw Ratio', fieldType: 'text', sortOrder: 20, fieldGroup: 'Optics', placeholder: 'e.g., 1.2-1.5:1' },
      { fieldName: 'Zoom', fieldType: 'text', sortOrder: 21, fieldGroup: 'Optics', placeholder: 'e.g., 1.3x optical' },
      { fieldName: 'Lens Shift', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Optics' },
      { fieldName: 'Keystone Correction', fieldType: 'select', options: ['None', 'Vertical', 'H/V', 'Auto'], sortOrder: 23, fieldGroup: 'Optics' },
      { fieldName: 'HDMI Ports', fieldType: 'number', sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'VGA Ports', fieldType: 'number', sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'USB', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Connectivity' },
      { fieldName: 'Built-in Speaker', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Audio' },
      { fieldName: 'Speaker Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 41, fieldGroup: 'Audio' },
      { fieldName: 'Lamp Life', fieldType: 'unit', unitType: 'time', unitOptions: ['hours'], sortOrder: 50, fieldGroup: 'Lamp' },
      { fieldName: 'Lamp Hours Used', fieldType: 'number', sortOrder: 51, fieldGroup: 'Lamp' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Lamp Dim', 'Color Issue', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'Interactive Display',
    description: 'Smart boards and interactive displays',
    icon: 'mdi:presentation',
    iconColor: '#22c55e',
    iconBackgroundColor: '#14532d',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['SMART', 'Promethean', 'ViewSonic', 'BenQ', 'Samsung', 'LG', 'Microsoft', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['in'], sortOrder: 10, fieldGroup: 'Display' },
      { fieldName: 'Resolution', fieldType: 'select', options: ['1080p', '4K'], sortOrder: 11, fieldGroup: 'Display' },
      { fieldName: 'Panel Type', fieldType: 'select', options: ['LCD', 'LED'], sortOrder: 12, fieldGroup: 'Display' },
      { fieldName: 'Brightness', fieldType: 'unit', unitType: 'brightness', unitOptions: ['nits'], sortOrder: 13, fieldGroup: 'Display' },
      { fieldName: 'Touch Points', fieldType: 'number', sortOrder: 20, fieldGroup: 'Touch' },
      { fieldName: 'Touch Technology', fieldType: 'select', options: ['IR', 'Capacitive', 'InGlass'], sortOrder: 21, fieldGroup: 'Touch' },
      { fieldName: 'Stylus Support', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Touch' },
      { fieldName: 'Built-in OS', fieldType: 'select', options: ['None', 'Android', 'Windows', 'Proprietary'], sortOrder: 30, fieldGroup: 'Software' },
      { fieldName: 'Built-in PC', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Software' },
      { fieldName: 'HDMI Inputs', fieldType: 'number', sortOrder: 40, fieldGroup: 'Connectivity' },
      { fieldName: 'USB Ports', fieldType: 'number', sortOrder: 41, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Connectivity' },
      { fieldName: 'Speakers', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Audio' },
      { fieldName: 'Mount Type', fieldType: 'select', options: ['Wall Mount', 'Mobile Stand', 'Both'], sortOrder: 60, fieldGroup: 'Physical' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Touch Issue', 'Display Issue', 'Defective'], sortOrder: 70, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'Label Printer',
    description: 'Label makers and barcode printers',
    icon: 'mdi:printer-pos',
    iconColor: '#f59e0b',
    iconBackgroundColor: '#78350f',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Zebra', 'DYMO', 'Brother', 'Rollo', 'Honeywell', 'TSC', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Printer Type', fieldType: 'select', options: ['Direct Thermal', 'Thermal Transfer', 'Inkjet', 'Laser'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Print Resolution', fieldType: 'text', sortOrder: 11, fieldGroup: 'Specs', placeholder: 'e.g., 203 dpi, 300 dpi' },
      { fieldName: 'Max Print Width', fieldType: 'unit', unitType: 'length', unitOptions: ['in', 'mm'], sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'Max Print Speed', fieldType: 'text', sortOrder: 13, fieldGroup: 'Specs', placeholder: 'e.g., 4 ips' },
      { fieldName: 'Label Type', fieldType: 'select', options: ['Continuous', 'Die-Cut', 'Both'], sortOrder: 20, fieldGroup: 'Media' },
      { fieldName: 'Max Roll Diameter', fieldType: 'unit', unitType: 'length', unitOptions: ['in', 'mm'], sortOrder: 21, fieldGroup: 'Media' },
      { fieldName: 'USB', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Connectivity' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Connectivity' },
      { fieldName: 'Cutter', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Peeler', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Display', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Features' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Print Quality Issue', 'Feed Issue', 'Defective'], sortOrder: 50, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Shredder',
    description: 'Paper and document shredders',
    icon: 'mdi:delete-variant',
    iconColor: '#dc2626',
    iconBackgroundColor: '#7f1d1d',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Fellowes', 'AmazonBasics', 'Bonsaii', 'Aurora', 'HSM', 'Swingline', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Cut Type', fieldType: 'select', options: ['Strip Cut', 'Cross Cut', 'Micro Cut', 'Super Micro Cut'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Security Level', fieldType: 'select', options: ['P-1', 'P-2', 'P-3', 'P-4', 'P-5', 'P-6', 'P-7'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Sheet Capacity', fieldType: 'number', sortOrder: 12, fieldGroup: 'Specs' },
      { fieldName: 'Throat Width', fieldType: 'unit', unitType: 'length', unitOptions: ['in', 'mm'], sortOrder: 13, fieldGroup: 'Specs' },
      { fieldName: 'Bin Capacity', fieldType: 'unit', unitType: 'volume', unitOptions: ['gal', 'L'], sortOrder: 20, fieldGroup: 'Capacity' },
      { fieldName: 'Run Time', fieldType: 'text', sortOrder: 21, fieldGroup: 'Capacity', placeholder: 'e.g., 20 minutes' },
      { fieldName: 'Cool Down Time', fieldType: 'text', sortOrder: 22, fieldGroup: 'Capacity' },
      { fieldName: 'Credit Cards', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Can Shred' },
      { fieldName: 'CDs/DVDs', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Can Shred' },
      { fieldName: 'Staples/Paper Clips', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Can Shred' },
      { fieldName: 'Jam Protection', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Auto Feed', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Jams Frequently', 'Motor Issue', 'Defective'], sortOrder: 50, fieldGroup: 'Status' }
    ]
  },
  // ==================== AUDIO/VIDEO ====================
  {
    name: 'Microphone',
    description: 'Recording and streaming microphones',
    icon: 'mdi:microphone',
    iconColor: '#be123c',
    iconBackgroundColor: '#4c0519',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Shure', 'Audio-Technica', 'Blue', 'Rode', 'HyperX', 'Elgato', 'Samson', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Microphone Type', fieldType: 'select', options: ['Condenser', 'Dynamic', 'Ribbon', 'USB'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Desktop', 'Handheld', 'Lavalier', 'Shotgun', 'Headset'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Polar Pattern', fieldType: 'select', options: ['Cardioid', 'Super-Cardioid', 'Omnidirectional', 'Bidirectional', 'Multi-Pattern'], sortOrder: 20, fieldGroup: 'Specs' },
      { fieldName: 'Frequency Response', fieldType: 'text', sortOrder: 21, fieldGroup: 'Specs', placeholder: 'e.g., 20Hz - 20kHz' },
      { fieldName: 'Sensitivity', fieldType: 'text', sortOrder: 22, fieldGroup: 'Specs' },
      { fieldName: 'Max SPL', fieldType: 'text', sortOrder: 23, fieldGroup: 'Specs', placeholder: 'e.g., 130 dB' },
      { fieldName: 'Connection', fieldType: 'select', options: ['XLR', 'USB', 'USB-C', '3.5mm', 'Wireless'], sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'Phantom Power', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Connectivity', helpText: '48V required' },
      { fieldName: 'Headphone Jack', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Mute Button', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Gain Control', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Features' },
      { fieldName: 'RGB Lighting', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Features' },
      { fieldName: 'Stand/Mount Included', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Included' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Low Output', 'Noise Issue', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ],
    suggests: ['Cable']
  },
  {
    name: 'Speakers',
    description: 'Desktop and bookshelf speakers',
    icon: 'mdi:speaker',
    iconColor: '#84cc16',
    iconBackgroundColor: '#365314',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['JBL', 'Logitech', 'Bose', 'Edifier', 'Audioengine', 'Klipsch', 'Creative', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Speaker Type', fieldType: 'select', options: ['Desktop 2.0', 'Desktop 2.1', 'Bookshelf', 'Portable', 'Smart Speaker'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Active/Passive', fieldType: 'select', options: ['Active (Powered)', 'Passive'], sortOrder: 11, fieldGroup: 'Type' },
      { fieldName: 'Total Power', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 20, fieldGroup: 'Specs' },
      { fieldName: 'Driver Size', fieldType: 'text', sortOrder: 21, fieldGroup: 'Specs', placeholder: 'e.g., 4" woofer, 1" tweeter' },
      { fieldName: 'Frequency Response', fieldType: 'text', sortOrder: 22, fieldGroup: 'Specs' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'Aux Input', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Connectivity' },
      { fieldName: 'RCA Input', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Connectivity' },
      { fieldName: 'Optical Input', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Connectivity' },
      { fieldName: 'USB Input', fieldType: 'boolean', sortOrder: 35, fieldGroup: 'Connectivity' },
      { fieldName: 'Remote Control', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Subwoofer Output', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'One Channel Issue', 'Distortion', 'Defective'], sortOrder: 50, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'AV Receiver',
    description: 'Home theater receivers and amplifiers',
    icon: 'mdi:audio-video',
    iconColor: '#0ea5e9',
    iconBackgroundColor: '#0c4a6e',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Denon', 'Yamaha', 'Marantz', 'Onkyo', 'Sony', 'Pioneer', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Channels', fieldType: 'select', options: ['5.1', '5.2', '7.1', '7.2', '9.1', '9.2', '11.2'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Power (per channel)', fieldType: 'unit', unitType: 'power', unitOptions: ['W'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'Dolby Atmos', fieldType: 'boolean', sortOrder: 20, fieldGroup: 'Audio Formats' },
      { fieldName: 'DTS:X', fieldType: 'boolean', sortOrder: 21, fieldGroup: 'Audio Formats' },
      { fieldName: 'IMAX Enhanced', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Audio Formats' },
      { fieldName: 'HDMI Inputs', fieldType: 'number', sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'HDMI Outputs', fieldType: 'number', sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'HDMI 2.1', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Connectivity' },
      { fieldName: '8K Passthrough', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Connectivity' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 35, fieldGroup: 'Connectivity' },
      { fieldName: 'Phono Input', fieldType: 'boolean', sortOrder: 36, fieldGroup: 'Connectivity' },
      { fieldName: 'AirPlay 2', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Streaming' },
      { fieldName: 'Chromecast', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Streaming' },
      { fieldName: 'Zone 2 Output', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Features' },
      { fieldName: 'Room Correction', fieldType: 'text', sortOrder: 51, fieldGroup: 'Features', placeholder: 'e.g., Audyssey MultEQ XT32' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Channel Issue', 'HDMI Issue', 'Defective'], sortOrder: 60, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter', 'Cable', 'Speakers']
  },
  {
    name: 'Streaming Device',
    description: 'Media streaming devices',
    icon: 'mdi:cast',
    iconColor: '#f43f5e',
    iconBackgroundColor: '#881337',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Apple', 'Roku', 'Amazon', 'Google', 'NVIDIA', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Max Resolution', fieldType: 'select', options: ['1080p', '4K', '4K HDR', '8K'], sortOrder: 10, fieldGroup: 'Video' },
      { fieldName: 'HDR Support', fieldType: 'text', sortOrder: 11, fieldGroup: 'Video', placeholder: 'e.g., HDR10, Dolby Vision, HDR10+' },
      { fieldName: 'Frame Rate', fieldType: 'select', options: ['30fps', '60fps', '120fps'], sortOrder: 12, fieldGroup: 'Video' },
      { fieldName: 'Dolby Atmos', fieldType: 'boolean', sortOrder: 20, fieldGroup: 'Audio' },
      { fieldName: 'Storage', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 30, fieldGroup: 'Specs' },
      { fieldName: 'RAM', fieldType: 'unit', unitType: 'data', unitOptions: ['GB'], sortOrder: 31, fieldGroup: 'Specs' },
      { fieldName: 'WiFi', fieldType: 'select', options: ['WiFi 5', 'WiFi 6', 'WiFi 6E'], sortOrder: 40, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Connectivity' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Connectivity' },
      { fieldName: 'USB Port', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Connectivity' },
      { fieldName: 'Voice Control', fieldType: 'select', options: ['None', 'Alexa', 'Google Assistant', 'Siri', 'Multiple'], sortOrder: 50, fieldGroup: 'Features' },
      { fieldName: 'Gaming Support', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Features' },
      { fieldName: 'AirPlay', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Features' },
      { fieldName: 'Power', fieldType: 'select', options: ['USB Powered', 'AC Adapter'], sortOrder: 60, fieldGroup: 'Power' },
      { fieldName: 'Remote Included', fieldType: 'boolean', sortOrder: 70, fieldGroup: 'Included' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'WiFi Issue', 'Remote Issue', 'Defective'], sortOrder: 80, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: 'Blu-ray Player',
    description: 'Blu-ray and DVD players',
    icon: 'mdi:disc-player',
    iconColor: '#3b82f6',
    iconBackgroundColor: '#1e3a8a',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Sony', 'Samsung', 'LG', 'Panasonic', 'Pioneer', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Disc Support', fieldType: 'select', options: ['DVD Only', 'Blu-ray', '4K UHD Blu-ray'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Region', fieldType: 'select', options: ['Region A', 'Region B', 'Region C', 'Region Free'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: 'HDR Support', fieldType: 'text', sortOrder: 20, fieldGroup: 'Video', placeholder: 'e.g., HDR10, Dolby Vision' },
      { fieldName: 'Upscaling', fieldType: 'select', options: ['None', '1080p', '4K'], sortOrder: 21, fieldGroup: 'Video' },
      { fieldName: 'Dolby Atmos', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Audio' },
      { fieldName: 'DTS:X', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Audio' },
      { fieldName: 'HDMI Output', fieldType: 'number', sortOrder: 40, fieldGroup: 'Connectivity' },
      { fieldName: 'Optical Output', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Connectivity' },
      { fieldName: 'USB Port', fieldType: 'boolean', sortOrder: 44, fieldGroup: 'Connectivity' },
      { fieldName: 'Streaming Apps', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Features' },
      { fieldName: 'SACD Support', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Features' },
      { fieldName: 'Remote Included', fieldType: 'boolean', sortOrder: 60, fieldGroup: 'Included' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Disc Read Issue', 'HDMI Issue', 'Defective'], sortOrder: 70, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  // ==================== SPECIALTY/INDUSTRIAL ====================
  {
    name: 'Barcode Scanner',
    description: 'Handheld barcode and QR code scanners',
    icon: 'mdi:barcode-scan',
    iconColor: '#eab308',
    iconBackgroundColor: '#713f12',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Zebra', 'Honeywell', 'Datalogic', 'Socket Mobile', 'Newland', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Scanner Type', fieldType: 'select', options: ['Laser', 'Linear Imager', '2D Imager', 'RFID'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Form Factor', fieldType: 'select', options: ['Handheld', 'Presentation', 'In-Counter', 'Wearable', 'Mobile'], sortOrder: 11, fieldGroup: 'Specs' },
      { fieldName: '1D Barcodes', fieldType: 'boolean', sortOrder: 20, fieldGroup: 'Symbologies' },
      { fieldName: '2D Barcodes', fieldType: 'boolean', sortOrder: 21, fieldGroup: 'Symbologies' },
      { fieldName: 'QR Codes', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Symbologies' },
      { fieldName: 'Connection', fieldType: 'select', options: ['USB Wired', 'Wireless 2.4GHz', 'Bluetooth', 'Multi-Mode'], sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'Interface', fieldType: 'select', options: ['USB HID', 'USB COM', 'RS-232', 'Bluetooth SPP', 'Bluetooth HID'], sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'Scan Range', fieldType: 'text', sortOrder: 40, fieldGroup: 'Performance', placeholder: 'e.g., up to 14 inches' },
      { fieldName: 'Scan Rate', fieldType: 'text', sortOrder: 41, fieldGroup: 'Performance', placeholder: 'e.g., 100 scans/sec' },
      { fieldName: 'IP Rating', fieldType: 'text', sortOrder: 50, fieldGroup: 'Durability' },
      { fieldName: 'Drop Spec', fieldType: 'text', sortOrder: 51, fieldGroup: 'Durability', placeholder: 'e.g., 6 ft to concrete' },
      { fieldName: 'Battery Type', fieldType: 'text', sortOrder: 60, fieldGroup: 'Power' },
      { fieldName: 'Scans Per Charge', fieldType: 'number', sortOrder: 61, fieldGroup: 'Power' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Read Issue', 'Battery Issue', 'Defective'], sortOrder: 70, fieldGroup: 'Status' }
    ]
  },
  {
    name: 'POS Terminal',
    description: 'Point of sale systems',
    icon: 'mdi:cash-register',
    iconColor: '#22c55e',
    iconBackgroundColor: '#14532d',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Square', 'Clover', 'Toast', 'Verifone', 'Ingenico', 'PAX', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Terminal Type', fieldType: 'select', options: ['Countertop', 'Mobile', 'All-in-One', 'PIN Pad Only'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Display Size', fieldType: 'unit', unitType: 'length', unitOptions: ['in'], sortOrder: 20, fieldGroup: 'Display' },
      { fieldName: 'Touchscreen', fieldType: 'boolean', sortOrder: 21, fieldGroup: 'Display' },
      { fieldName: 'Customer Display', fieldType: 'boolean', sortOrder: 22, fieldGroup: 'Display' },
      { fieldName: 'Chip (EMV)', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Payment' },
      { fieldName: 'Contactless/NFC', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Payment' },
      { fieldName: 'Magnetic Stripe', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Payment' },
      { fieldName: 'PIN Entry', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Payment' },
      { fieldName: 'Receipt Printer', fieldType: 'select', options: ['None', 'Thermal Built-in', 'External'], sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Barcode Scanner', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Cash Drawer Port', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Features' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Connectivity' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 52, fieldGroup: 'Connectivity' },
      { fieldName: 'Cellular', fieldType: 'boolean', sortOrder: 53, fieldGroup: 'Connectivity' },
      { fieldName: 'Operating System', fieldType: 'select', options: ['Android', 'Linux', 'Windows', 'Proprietary'], sortOrder: 60, fieldGroup: 'Software' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Reader Issue', 'Printer Issue', 'Defective'], sortOrder: 70, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Digital Signage',
    description: 'Commercial displays and digital signs',
    icon: 'mdi:billboard',
    iconColor: '#f97316',
    iconBackgroundColor: '#7c2d12',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Samsung', 'LG', 'NEC', 'BenQ', 'Philips', 'ViewSonic', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Screen Size', fieldType: 'unit', unitType: 'length', unitOptions: ['in'], sortOrder: 10, fieldGroup: 'Display' },
      { fieldName: 'Resolution', fieldType: 'select', options: ['1080p', '4K'], sortOrder: 11, fieldGroup: 'Display' },
      { fieldName: 'Orientation', fieldType: 'select', options: ['Landscape', 'Portrait', 'Both'], sortOrder: 12, fieldGroup: 'Display' },
      { fieldName: 'Brightness', fieldType: 'unit', unitType: 'brightness', unitOptions: ['nits'], sortOrder: 13, fieldGroup: 'Display' },
      { fieldName: 'Panel Type', fieldType: 'select', options: ['IPS', 'VA', 'LED', 'OLED'], sortOrder: 14, fieldGroup: 'Display' },
      { fieldName: 'Operating Hours', fieldType: 'select', options: ['16/7', '24/7'], sortOrder: 20, fieldGroup: 'Specs' },
      { fieldName: 'Built-in Media Player', fieldType: 'boolean', sortOrder: 21, fieldGroup: 'Specs' },
      { fieldName: 'Built-in OS', fieldType: 'select', options: ['None', 'Android', 'Tizen', 'webOS', 'Windows'], sortOrder: 22, fieldGroup: 'Specs' },
      { fieldName: 'HDMI Inputs', fieldType: 'number', sortOrder: 30, fieldGroup: 'Connectivity' },
      { fieldName: 'DisplayPort', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Connectivity' },
      { fieldName: 'USB Ports', fieldType: 'number', sortOrder: 32, fieldGroup: 'Connectivity' },
      { fieldName: 'Ethernet', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Connectivity' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Connectivity' },
      { fieldName: 'RS-232', fieldType: 'boolean', sortOrder: 35, fieldGroup: 'Connectivity' },
      { fieldName: 'Outdoor Rated', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Physical' },
      { fieldName: 'IP Rating', fieldType: 'text', sortOrder: 41, fieldGroup: 'Physical' },
      { fieldName: 'Touchscreen', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Physical' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Dead Pixels', 'Burn-in', 'Defective'], sortOrder: 50, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter', 'Cable']
  },
  {
    name: '3D Printer',
    description: '3D printers and additive manufacturing',
    icon: 'mdi:printer-3d',
    iconColor: '#a855f7',
    iconBackgroundColor: '#581c87',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Prusa', 'Creality', 'Bambu Lab', 'Anycubic', 'Formlabs', 'Ultimaker', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Technology', fieldType: 'select', options: ['FDM/FFF', 'SLA', 'MSLA', 'SLS', 'MJF'], sortOrder: 10, fieldGroup: 'Specs' },
      { fieldName: 'Build Volume', fieldType: 'text', sortOrder: 11, fieldGroup: 'Specs', placeholder: 'e.g., 250x210x210mm' },
      { fieldName: 'Layer Resolution', fieldType: 'text', sortOrder: 12, fieldGroup: 'Specs', placeholder: 'e.g., 0.05-0.3mm' },
      { fieldName: 'XY Resolution', fieldType: 'text', sortOrder: 13, fieldGroup: 'Specs' },
      { fieldName: 'Nozzle Size', fieldType: 'text', sortOrder: 20, fieldGroup: 'Extruder', placeholder: 'e.g., 0.4mm' },
      { fieldName: 'Max Nozzle Temp', fieldType: 'unit', unitType: 'temperature', unitOptions: ['°C'], sortOrder: 21, fieldGroup: 'Extruder' },
      { fieldName: 'Max Bed Temp', fieldType: 'unit', unitType: 'temperature', unitOptions: ['°C'], sortOrder: 22, fieldGroup: 'Extruder' },
      { fieldName: 'Direct Drive/Bowden', fieldType: 'select', options: ['Direct Drive', 'Bowden'], sortOrder: 23, fieldGroup: 'Extruder' },
      { fieldName: 'Dual Extruder', fieldType: 'boolean', sortOrder: 24, fieldGroup: 'Extruder' },
      { fieldName: 'Supported Materials', fieldType: 'text', sortOrder: 30, fieldGroup: 'Materials', placeholder: 'e.g., PLA, PETG, ABS, TPU' },
      { fieldName: 'Enclosed', fieldType: 'boolean', sortOrder: 40, fieldGroup: 'Features' },
      { fieldName: 'Heated Bed', fieldType: 'boolean', sortOrder: 41, fieldGroup: 'Features' },
      { fieldName: 'Auto Bed Leveling', fieldType: 'boolean', sortOrder: 42, fieldGroup: 'Features' },
      { fieldName: 'Filament Sensor', fieldType: 'boolean', sortOrder: 43, fieldGroup: 'Features' },
      { fieldName: 'WiFi', fieldType: 'boolean', sortOrder: 50, fieldGroup: 'Connectivity' },
      { fieldName: 'Camera', fieldType: 'boolean', sortOrder: 51, fieldGroup: 'Connectivity' },
      { fieldName: 'Firmware', fieldType: 'text', sortOrder: 60, fieldGroup: 'Software' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Calibration Needed', 'Extruder Issue', 'Bed Issue', 'Defective'], sortOrder: 70, fieldGroup: 'Status' }
    ],
    suggests: ['Power Adapter']
  },
  {
    name: 'Multimeter',
    description: 'Digital and analog multimeters',
    icon: 'mdi:meter-electric',
    iconColor: '#ef4444',
    iconBackgroundColor: '#7f1d1d',
    fields: [
      { fieldName: 'Manufacturer', fieldType: 'select', options: ['Fluke', 'Klein Tools', 'Hioki', 'Keysight', 'Brymen', 'Uni-T', 'Other'], sortOrder: 1, fieldGroup: 'General' },
      { fieldName: 'Model', fieldType: 'text', isRequired: true, sortOrder: 2, fieldGroup: 'General' },
      { fieldName: 'Serial Number', fieldType: 'text', sortOrder: 3, fieldGroup: 'General' },
      { fieldName: 'Meter Type', fieldType: 'select', options: ['Digital', 'Analog', 'Clamp Meter', 'Bench'], sortOrder: 10, fieldGroup: 'Type' },
      { fieldName: 'Display Count', fieldType: 'text', sortOrder: 11, fieldGroup: 'Type', placeholder: 'e.g., 6000 count, 50000 count' },
      { fieldName: 'True RMS', fieldType: 'boolean', sortOrder: 12, fieldGroup: 'Type' },
      { fieldName: 'DC Voltage Range', fieldType: 'text', sortOrder: 20, fieldGroup: 'Ranges' },
      { fieldName: 'AC Voltage Range', fieldType: 'text', sortOrder: 21, fieldGroup: 'Ranges' },
      { fieldName: 'DC Current Range', fieldType: 'text', sortOrder: 22, fieldGroup: 'Ranges' },
      { fieldName: 'AC Current Range', fieldType: 'text', sortOrder: 23, fieldGroup: 'Ranges' },
      { fieldName: 'Resistance Range', fieldType: 'text', sortOrder: 24, fieldGroup: 'Ranges' },
      { fieldName: 'Capacitance', fieldType: 'boolean', sortOrder: 30, fieldGroup: 'Functions' },
      { fieldName: 'Frequency', fieldType: 'boolean', sortOrder: 31, fieldGroup: 'Functions' },
      { fieldName: 'Temperature', fieldType: 'boolean', sortOrder: 32, fieldGroup: 'Functions' },
      { fieldName: 'Continuity', fieldType: 'boolean', sortOrder: 33, fieldGroup: 'Functions' },
      { fieldName: 'Diode Test', fieldType: 'boolean', sortOrder: 34, fieldGroup: 'Functions' },
      { fieldName: 'Basic Accuracy', fieldType: 'text', sortOrder: 40, fieldGroup: 'Accuracy', placeholder: 'e.g., ±0.5%' },
      { fieldName: 'CAT Rating', fieldType: 'select', options: ['CAT I', 'CAT II', 'CAT III', 'CAT IV'], sortOrder: 50, fieldGroup: 'Safety' },
      { fieldName: 'Data Logging', fieldType: 'boolean', sortOrder: 60, fieldGroup: 'Features' },
      { fieldName: 'Bluetooth', fieldType: 'boolean', sortOrder: 61, fieldGroup: 'Features' },
      { fieldName: 'Battery Type', fieldType: 'text', sortOrder: 70, fieldGroup: 'Power' },
      { fieldName: 'Working Condition', fieldType: 'select', options: ['Working', 'Calibration Needed', 'Display Issue', 'Defective'], sortOrder: 80, fieldGroup: 'Status' }
    ]
  }
];

// Helper function to get a template by name
export function getDefaultTemplate(name: string): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.name === name);
}

// Get all template names
export function getDefaultTemplateNames(): string[] {
  return DEFAULT_TEMPLATES.map(t => t.name);
}
