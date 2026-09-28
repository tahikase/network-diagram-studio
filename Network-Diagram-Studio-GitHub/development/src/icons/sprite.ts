import builtInSprite from './icon-sprite.svg?raw';
import { CATEGORIES, ICONS, ICONS_BY_ID } from './manifest';
import {
  CATEGORIES_ORDER, RESOURCE_TYPES, RESOURCE_TYPES_BY_SLUG, RESOURCE_TYPE_BY_ICON,
} from '../model/resource-types';
import { runtimeExtensions } from '../runtime/extensions';

export let iconSprite = builtInSprite;

export function registerVendorIcons() {
  const vendors = runtimeExtensions().ndsNonProductionVendors;
  if (!vendors) return;
  iconSprite = vendors.register({
    icons: ICONS,
    iconsById: ICONS_BY_ID,
    iconCategories: CATEGORIES,
    resourceTypes: RESOURCE_TYPES,
    resourceTypesBySlug: RESOURCE_TYPES_BY_SLUG,
    resourceTypeByIcon: RESOURCE_TYPE_BY_ICON,
    resourceCategories: CATEGORIES_ORDER,
    sprite: iconSprite,
  });
}
