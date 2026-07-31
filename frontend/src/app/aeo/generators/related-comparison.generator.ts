import {
  AeoRelatedComparison,
  AeoRelatedVehicle,
  AeoRelatedVehicleInput,
  AeoVehicleLike
} from '../aeo.types';

const MAX_COMPARISONS = 3;

/**
 * Build compare deep-links for selected variant vs nearest related peers.
 * Only uses ids already in the related slate — never scans the catalog.
 */
export function generateRelatedComparisons(
  selected: AeoVehicleLike | null | undefined,
  relatedVehicles: AeoRelatedVehicleInput[] | AeoRelatedVehicle[] | null | undefined,
  opts?: { brandName?: string; modelName?: string }
): AeoRelatedComparison[] {
  const selectedId = selected?.id?.trim();
  if (!selected || !selectedId || !relatedVehicles?.length) return [];

  const labelLeft =
    [opts?.brandName, opts?.modelName].filter(Boolean).join(' ') ||
    selected.parentModel ||
    selected.name ||
    'This EV';

  const out: AeoRelatedComparison[] = [];
  const seen = new Set<string>();

  for (const peer of relatedVehicles) {
    if (out.length >= MAX_COMPARISONS) break;
    const peerId = peer.id?.trim();
    if (!peerId || peerId === selectedId || seen.has(peerId)) continue;
    seen.add(peerId);

    const peerName = peerDisplayName(peer);
    out.push({
      label: `${labelLeft} vs ${peerName}`,
      href: `/compare?ids=${encodeURIComponent(selectedId)},${encodeURIComponent(peerId)}`
    });
  }

  return out;
}

function peerDisplayName(peer: AeoRelatedVehicleInput | AeoRelatedVehicle): string {
  if ('parentModel' in peer || 'variantName' in peer || 'name' in peer) {
    const input = peer as AeoRelatedVehicleInput & AeoRelatedVehicle;
    const composed = [input.parentModel, input.variantName].filter(Boolean).join(' ').trim();
    if (composed) return composed;
    if (input.name?.trim()) return input.name.trim();
  }
  return 'Peer EV';
}
