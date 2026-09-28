// Author-time container sizes, shared by the hand-written template registry
// and the generated Learn topologies.
//
// These are the starting sizes the auto-layout row-flow packer
// (`relayoutForNoOverlap` in src/model/auto-layout.ts) begins from. It fits
// typical hierarchies horizontally instead of stacking every child in one
// column, and it grows any container whose children don't fit — so these are
// minimums, not maximums.
//   * region  — wide enough for 2 typical vnets side-by-side
//   * vnet    — wide enough for 2 typical subnets side-by-side
//   * subnet  — wide enough for 1 leaf resource (180 px) with padding
//   * onprem  — small root-level container
//   * sub/rg  — mid-size container
export function containerSize(type: string): { w: number; h: number } | undefined {
  switch (type) {
    case 'group-region':
      return { w: 1500, h: 500 };
    case 'group-vnet':
      return { w: 700, h: 450 };
    case 'group-subnet':
      return { w: 300, h: 350 };
    case 'group-onprem':
      return { w: 320, h: 260 };
    case 'group-subscription':
    case 'group-rg':
      return { w: 700, h: 400 };
    default:
      return undefined;
  }
}
