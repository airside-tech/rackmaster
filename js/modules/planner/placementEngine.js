import { createEmptyRackSlots, minimumRackDepthCm } from "./state.js";

export function rebuildRackSlots(state) {
    state.rackSlots = createEmptyRackSlots(state.rackHeightRU);

    state.rackComponents.forEach(component => {
        for (let offset = 0; offset < component.ru; offset += 1) {
            const slotIndex = component.position - 1 + offset;
            if (!state.rackSlots[slotIndex]) {
                continue;
            }

            if ((component.face || "front") === "rear") {
                state.rackSlots[slotIndex].rear = true;
            } else {
                state.rackSlots[slotIndex].front = true;
            }
        }
    });
}

export function getRackDepthCm(state) {
    return Math.max(minimumRackDepthCm, Number(state.rackProfile.rackDepthCm) || minimumRackDepthCm);
}

export function getRackMinDepthClearanceCm(state) {
    return Math.max(0, Number(state.rackProfile.minDepthClearanceCm) || 0);
}

export function getComponentFace(component) {
    return component?.face === "rear" ? "rear" : "front";
}

export function getComponentDepthCm(component) {
    return Math.max(0, Number(component?.depth) || 0);
}

export function getOppositeFace(face) {
    return face === "rear" ? "front" : "rear";
}

export function getComponentsOnFace(state, face) {
    return state.rackComponents.filter(component => getComponentFace(component) === face);
}

export function doComponentsOverlapInRU(leftComponent, rightComponent) {
    const leftEnd = leftComponent.position + leftComponent.ru - 1;
    const rightEnd = rightComponent.position + rightComponent.ru - 1;
    return !(leftEnd < rightComponent.position || leftComponent.position > rightEnd);
}

export function canFacesShareDepth(state, candidateComponent, existingComponent) {
    const rackDepthCm = getRackDepthCm(state);
    const clearanceCm = getRackMinDepthClearanceCm(state);
    if (rackDepthCm <= 0) {
        return false;
    }

    return getComponentDepthCm(candidateComponent) + getComponentDepthCm(existingComponent) + clearanceCm <= rackDepthCm;
}

export function getRemainingRackDepthCm(state, component) {
    return Math.max(0, getRackDepthCm(state) - getComponentDepthCm(component));
}

export function leavesRequiredClearanceForOppositeFace(state, component) {
    const rackDepthCm = getRackDepthCm(state);
    const clearanceCm = getRackMinDepthClearanceCm(state);

    if (rackDepthCm <= 0 || clearanceCm <= 0) {
        return false;
    }

    return getRemainingRackDepthCm(state, component) >= clearanceCm;
}

export function hasOverlappingComponentOnFace(state, component, face) {
    return getComponentsOnFace(state, face).some(candidate => doComponentsOverlapInRU(component, candidate));
}

export function getOppositeFaceDepthPairs(state) {
    const pairs = [];

    getComponentsOnFace(state, "front").forEach(frontComponent => {
        getComponentsOnFace(state, "rear").forEach(rearComponent => {
            if (!doComponentsOverlapInRU(frontComponent, rearComponent)) {
                return;
            }

            pairs.push({
                frontComponent,
                rearComponent,
                canShareDepth: canFacesShareDepth(state, frontComponent, rearComponent),
                topRU: Math.max(frontComponent.position, rearComponent.position),
                bottomRU: Math.min(
                    frontComponent.position + frontComponent.ru - 1,
                    rearComponent.position + rearComponent.ru - 1
                )
            });
        });
    });

    return pairs;
}

export function getConflictingOppositeFaceComponentIds(state, depthPairs = getOppositeFaceDepthPairs(state)) {
    const conflictSet = new Set();

    depthPairs.forEach(pair => {
        if (pair.canShareDepth) {
            return;
        }

        conflictSet.add(pair.frontComponent.id);
        conflictSet.add(pair.rearComponent.id);
    });

    return conflictSet;
}

export function formatClearanceCm(value) {
    const normalizedValue = Number(value) || 0;
    return Number.isInteger(normalizedValue)
        ? String(normalizedValue)
        : normalizedValue.toFixed(1);
}

export function describeConflictingComponents(conflicts) {
    const names = Array.from(new Set(conflicts.map(conflict => conflict.component.name).filter(Boolean)));

    if (names.length === 0) {
        return "the opposite-face components";
    }

    if (names.length === 1) {
        return names[0];
    }

    if (names.length === 2) {
        return `${names[0]} and ${names[1]}`;
    }

    return `${names[0]}, ${names[1]}, and ${names.length - 2} more`;
}

export function getPlacementAnalysis(state, position, componentHeightRU, componentIdToIgnore = null, face = state.currentView, depth = 0) {
    const candidateComponent = {
        position,
        ru: componentHeightRU,
        face,
        depth
    };
    const analysis = {
        candidateComponent,
        isOutOfBounds: position < 1 || position + componentHeightRU - 1 > state.rackHeightRU,
        exceedsRackDepth: false,
        sameFaceConflict: null,
        depthConflicts: [],
        worstDepthConflict: null,
        hasSameFaceConflict: false,
        hasHardDepthConflict: false,
        hasWarningDepthConflict: false,
        canPlace: false,
        canPlaceWithoutPrompt: false
    };

    if (analysis.isOutOfBounds) {
        return analysis;
    }

    analysis.exceedsRackDepth = getComponentDepthCm(candidateComponent) > getRackDepthCm(state);

    if (analysis.exceedsRackDepth) {
        return analysis;
    }

    state.rackComponents.forEach(component => {
        if (component.id === componentIdToIgnore) {
            return;
        }

        if (!doComponentsOverlapInRU(candidateComponent, component)) {
            return;
        }

        if (getComponentFace(component) === face) {
            analysis.sameFaceConflict = component;
            analysis.hasSameFaceConflict = true;
            return;
        }

        const freeClearanceCm = getRackDepthCm(state) - getComponentDepthCm(candidateComponent) - getComponentDepthCm(component);
        const meetsMinimumClearance = canFacesShareDepth(state, candidateComponent, component);
        const isHardDepthConflict = freeClearanceCm <= 0;
        const isWarningDepthConflict = !isHardDepthConflict && !meetsMinimumClearance;
        const conflict = {
            component,
            freeClearanceCm,
            meetsMinimumClearance,
            isHardDepthConflict,
            isWarningDepthConflict
        };

        analysis.depthConflicts.push(conflict);

        if (!analysis.worstDepthConflict || conflict.freeClearanceCm < analysis.worstDepthConflict.freeClearanceCm) {
            analysis.worstDepthConflict = conflict;
        }
    });

    analysis.hasHardDepthConflict = analysis.depthConflicts.some(conflict => conflict.isHardDepthConflict);
    analysis.hasWarningDepthConflict = analysis.depthConflicts.some(conflict => conflict.isWarningDepthConflict);
    analysis.canPlace = !analysis.hasSameFaceConflict && !analysis.hasHardDepthConflict;
    analysis.canPlaceWithoutPrompt = analysis.canPlace && !analysis.hasWarningDepthConflict;

    return analysis;
}

export function buildDepthConflictMessage(state, componentName, analysis) {
    const conflictNames = describeConflictingComponents(analysis.depthConflicts);
    const requiredClearanceCm = getRackMinDepthClearanceCm(state);
    const availableClearanceCm = analysis.worstDepthConflict
        ? formatClearanceCm(analysis.worstDepthConflict.freeClearanceCm)
        : "0";

    return `${componentName} leaves ${availableClearanceCm} cm clearance with ${conflictNames}. Minimum depth clearance is ${requiredClearanceCm} cm.`;
}

export function resolvePlacementAttempt(state, componentName, analysis, { setNotice, confirmFn }) {
    if (analysis.isOutOfBounds) {
        setNotice("Component exceeds rack height.");
        return false;
    }

    if (analysis.exceedsRackDepth) {
        setNotice(`Cannot place ${componentName}. Component depth exceeds the rack depth of ${getRackDepthCm(state)} cm.`);
        return false;
    }

    if (analysis.hasSameFaceConflict) {
        setNotice(`U${analysis.candidateComponent.position} is already occupied on the ${getComponentFace(analysis.sameFaceConflict)} side.`);
        return false;
    }

    if (analysis.hasHardDepthConflict) {
        setNotice(`Cannot place ${componentName}. ${buildDepthConflictMessage(state, componentName, analysis)} Clearance must stay above 0 cm.`);
        return false;
    }

    if (!analysis.hasWarningDepthConflict) {
        return true;
    }

    const confirmed = confirmFn(`${buildDepthConflictMessage(state, componentName, analysis)} Continue anyway?`);
    if (!confirmed) {
        setNotice(`Placement canceled for ${componentName}.`);
        return false;
    }

    return true;
}

export function getBlockedOppositeFaceComponents(state) {
    const activeFace = state.currentView;
    const rackDepthCm = getRackDepthCm(state);
    const clearanceCm = getRackMinDepthClearanceCm(state);

    if (rackDepthCm <= 0 || clearanceCm <= 0) {
        return [];
    }

    return getComponentsOnFace(state, getOppositeFace(activeFace)).filter(component => {
        if (leavesRequiredClearanceForOppositeFace(state, component)) {
            return false;
        }

        return !hasOverlappingComponentOnFace(state, component, activeFace);
    });
}

export function isRackPositionAvailable(state, position, componentHeightRU, componentIdToIgnore = null, face = state.currentView, depth = 0) {
    return getPlacementAnalysis(state, position, componentHeightRU, componentIdToIgnore, face, depth).canPlace;
}

export function findFirstAvailablePosition(state, componentHeightRU, face = state.currentView, depth = 0) {
    const maxStartPosition = state.rackHeightRU - componentHeightRU + 1;

    for (let position = 1; position <= maxStartPosition; position += 1) {
        if (isRackPositionAvailable(state, position, componentHeightRU, null, face, depth)) {
            return position;
        }
    }

    return null;
}

export function getUsedUnitsRU(rackComponents) {
    return rackComponents.reduce((sum, component) => sum + component.ru, 0);
}

export function getHighestOccupiedRU(rackComponents) {
    return rackComponents.reduce((highest, component) => Math.max(highest, component.position + component.ru - 1), 0);
}

export function getTotalPowerConsumption(rackComponents) {
    return rackComponents.reduce((sum, component) => sum + (Number(component.power) || 0), 0);
}

export function getComponentRangeLabel(component) {
    const endRU = component.position + component.ru - 1;
    return component.ru > 1 ? `U${component.position}-U${endRU}` : `U${component.position}`;
}
