import { createId, normalizeTypeClass } from "../typeUtils.js";
import { createEmptySideCompartmentState } from "./sideCompartments.js";

export const rackUnitHeightRU = 1;
export const rackUnitPixelHeight = 27;
export const defaultRackHeightRU = 42;
export const maximumRackHeightRU = 50;
export const warningRackHeightRU = 47;
export const minimumRackDepthCm = 20;
export const defaultRackWidthCm = 60;
export const minimumRackWidthCm = 40;

export const defaultLibrarySeed = [
    {
        name: "Network Devices",
        items: [
            { name: "Router", ru: 2, typeClass: "router", defaultDepth: 60, defaultPower: 250 },
            { name: "Switch", ru: 1, typeClass: "switch", defaultDepth: 35, defaultPower: 90 },
            { name: "Firewall", ru: 1, typeClass: "firewall", defaultDepth: 45, defaultPower: 120 },
            { name: "Load Balancer", ru: 1, typeClass: "load-balancer", defaultDepth: 45, defaultPower: 150 },
            { name: "Access Point", ru: 1, typeClass: "access-point", defaultDepth: 22, defaultPower: 30 }
        ]
    },
    {
        name: "Storage",
        items: [
            { name: "NAS", ru: 2, typeClass: "nas", defaultDepth: 55, defaultPower: 220 },
            { name: "SAN", ru: 4, typeClass: "san", defaultDepth: 85, defaultPower: 450 }
        ]
    },
    {
        name: "Servers",
        items: [
            { name: "Web Server", ru: 2, typeClass: "web-server", defaultDepth: 70, defaultPower: 280 },
            { name: "Database Server", ru: 2, typeClass: "database-server", defaultDepth: 75, defaultPower: 360 },
            { name: "Application Server", ru: 2, typeClass: "app-server", defaultDepth: 70, defaultPower: 300 }
        ]
    },
    {
        name: "Power Equipment",
        items: [
            { name: "UPS", ru: 2, typeClass: "ups", defaultDepth: 66, defaultPower: 500 },
            { name: "PDU", ru: 1, typeClass: "pdu", defaultDepth: 12, defaultPower: 20 }
        ]
    },
    {
        name: "Rack Mounting Equipment",
        items: [
            { name: "Brush Panel", ru: 1, typeClass: "accessories", defaultDepth: 8, defaultPower: 0 },
            { name: "Cable Hoop", ru: 1, typeClass: "accessories", defaultDepth: 12, defaultPower: 0 }
        ]
    },
    {
        name: "KVM",
        items: [
            { name: "KVM Transmitter", ru: 1, typeClass: "kvm", defaultDepth: 30, defaultPower: 35 },
            { name: "KVM Receiver", ru: 1, typeClass: "kvm", defaultDepth: 28, defaultPower: 25 },
            { name: "KVM Manager", ru: 1, typeClass: "kvm", defaultDepth: 35, defaultPower: 45 }
        ]
    },
    {
        name: "Side Compartment Components",
        isSideCompartment: true,
        items: [
            {
                name: "Fibre Optic Cables",
                ru: 5,
                typeClass: "side-compartment-component",
                defaultDepth: 0,
                defaultPower: 0,
                description: "Cable tray / slack storage",
                customColor: "#1d8a9b",
                isSideCompartment: true,
                sideItemType: "fiber-cables"
            },
            {
                name: "Power Cables",
                ru: 5,
                typeClass: "side-compartment-component",
                defaultDepth: 0,
                defaultPower: 0,
                description: "Power routing and excess length",
                customColor: "#d97706",
                isSideCompartment: true,
                sideItemType: "power-cables"
            },
            {
                name: "Patch Cables",
                ru: 5,
                typeClass: "side-compartment-component",
                defaultDepth: 0,
                defaultPower: 0,
                description: "Patch bundle / service loops",
                customColor: "#2c9874",
                isSideCompartment: true,
                sideItemType: "patch-cables"
            }
        ]
    }
];

export function createLibraryState(seedCategories) {
    return seedCategories.map(category => ({
        id: createId("category"),
        name: category.name,
        isSideCompartment: Boolean(category.isSideCompartment),
        expanded: false,
        items: category.items.map(item => ({
            id: item.id || createId("library"),
            name: item.name,
            ru: item.ru,
            typeClass: normalizeTypeClass(item.typeClass || item.name),
            description: item.description || "",
            defaultDepth: item.defaultDepth || 0,
            defaultPower: item.defaultPower || 0,
            customColor: item.customColor || null,
            isSideCompartment: Boolean(item.isSideCompartment || category.isSideCompartment),
            sideItemType: Boolean(item.isSideCompartment || category.isSideCompartment)
                ? (String(item.sideItemType || "custom-label").trim() || "custom-label")
                : null
        }))
    }));
}

export function createEmptyRackSlots(heightRU) {
    return Array.from({ length: heightRU }, () => ({ front: false, rear: false }));
}

export function createInitialPlannerState() {
    return {
        rackHeightRU: defaultRackHeightRU,
        currentView: "front",
        rackProfile: {
            name: "Main Rack",
            tag: "RACK-01",
            room: "",
            owner: "",
            powerA: "",
            powerB: "",
            rackDepthCm: minimumRackDepthCm,
            rackWidthCm: defaultRackWidthCm,
            minDepthClearanceCm: 0,
            notes: ""
        },
        libraryCategories: createLibraryState(defaultLibrarySeed),
        rackComponents: [],
        sideCompartmentItems: createEmptySideCompartmentState(),
        rackSlots: createEmptyRackSlots(defaultRackHeightRU),
        libraryFormExpanded: false,
        sideCompartmentFormExpanded: false,
        rackPropertiesPanelExpanded: false,
        selectedComponentId: null,
        selectedLibraryCategoryId: null,
        selectedLibraryItemId: null,
        selectedSideItemId: null,
        activeDragSource: null,
        dragPreview: null,
        noticeLevel: "info",
        notice: "Drag a component into the rack or create a custom component below."
    };
}
