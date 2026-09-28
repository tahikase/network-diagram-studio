import * as React from 'react';
import { getSmoothStepPath } from '@xyflow/react';
import { registerVendorIcons } from '../icons/sprite';
import { DICT } from '../i18n/strings';
import { getResourceType } from '../model/resource-types';
import { isGroupNode, renderedSize } from '../model/size-match';
import { refitNode, useDiagramStore } from '../store/diagram-store';
import { runtimeExtensions } from './extensions';

// Install native bridges before the first render, not in a StrictMode effect.
export function initializeRuntime() {
  const extensions = runtimeExtensions();
  const bridge = { React, store: useDiagramStore };
  registerVendorIcons();
  extensions.ndsSettingsHelp?.install(DICT);
  extensions.ndsNonProductionConnectors?.install({ ...bridge, smoothStep: getSmoothStepPath });
  extensions.ndsNonProductionCaptions?.install({ ...bridge, refit: refitNode, resourceType: getResourceType });
  extensions.ndsArmResourceIds?.install({ ...bridge, resourceType: getResourceType });
  if (extensions.ndsNonProductionGroupPaste) {
    useDiagramStore.setState({
      pasteNodes: extensions.ndsNonProductionGroupPaste(
        useDiagramStore.getState().pasteNodes, isGroupNode, renderedSize,
        () => useDiagramStore.getState().diagram
      ),
    });
  }
}
