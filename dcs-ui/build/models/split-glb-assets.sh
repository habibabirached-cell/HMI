#!/usr/bin/env bash
# Split a monolithic GLB into geometry.bin + textures/ + model.gltf (Draco + WebP).
# Requires: gltf-transform, jq, cwebp (brew install webp)
set -euo pipefail

if ! command -v gltf-transform >/dev/null 2>&1; then
  echo "gltf-transform CLI is required (npm i -g @gltf-transform/cli)" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi
if ! command -v cwebp >/dev/null 2>&1; then
  echo "cwebp is required (brew install webp)" >&2
  exit 1
fi

split_glb() {
  local src_glb="$1"
  local out_dir="$2"

  if [[ ! -f "$src_glb" ]]; then
    echo "Missing input: $src_glb" >&2
    exit 1
  fi

  echo "==> Splitting $(basename "$src_glb") → $out_dir"
  rm -rf "$out_dir"
  mkdir -p "$out_dir/textures"

  gltf-transform copy "$src_glb" "$out_dir/model.gltf"

  for pair in \
    "baseColor_1.jpg:baseColor.jpg" \
    "metallicRoughness_1.jpg:metallicRoughness.jpg" \
    "normal_1.jpg:normal.jpg" \
    "emissive_1.jpg:emissive.jpg"; do
    local old="${pair%%:*}"
    local new="${pair##*:}"
    if [[ -f "$out_dir/$old" ]]; then
      mv "$out_dir/$old" "$out_dir/textures/$new"
    fi
  done

  if [[ ! -f "$out_dir/model.bin" ]]; then
    echo "Expected model.bin after copy" >&2
    exit 1
  fi
  mv "$out_dir/model.bin" "$out_dir/geometry.bin"

  jq '
    .buffers[0].uri = "geometry.bin"
    | .images |= map(
        if .uri == "baseColor_1.jpg" then .uri = "textures/baseColor.jpg"
        elif .uri == "metallicRoughness_1.jpg" then .uri = "textures/metallicRoughness.jpg"
        elif .uri == "normal_1.jpg" then .uri = "textures/normal.jpg"
        elif .uri == "emissive_1.jpg" then .uri = "textures/emissive.jpg"
        else . end
      )
  ' "$out_dir/model.gltf" > "$out_dir/model.tmp.gltf"
  mv "$out_dir/model.tmp.gltf" "$out_dir/model.gltf"

  # Draco-compress geometry in place (~59MB → ~5MB).
  gltf-transform draco "$out_dir/model.gltf" "$out_dir/_draco.gltf"
  mv "$out_dir/_draco.gltf" "$out_dir/model.gltf"

  # Convert JPEG textures to WebP without touching geometry.
  for jpg in "$out_dir/textures"/*.jpg; do
    [[ -f "$jpg" ]] || continue
    local webp="${jpg%.jpg}.webp"
    cwebp -q 85 "$jpg" -o "$webp" >/dev/null
    rm -f "$jpg"
  done

  jq '
    .images |= map(
      .uri |= sub("\\.jpg$"; ".webp")
      | .mimeType = "image/webp"
    )
  ' "$out_dir/model.gltf" > "$out_dir/model.tmp.gltf"
  mv "$out_dir/model.tmp.gltf" "$out_dir/model.gltf"

  echo "    geometry.bin: $(du -h "$out_dir/geometry.bin" | cut -f1)"
  echo "    textures:     $(du -sh "$out_dir/textures" | cut -f1)"
  echo "    total:        $(du -sh "$out_dir" | cut -f1)"
}

ROOT="$(cd "$(dirname "$0")" && pwd)"

split_glb \
  "$ROOT/Meshy_AI_Outdoor_Data_Center_S_0619212907_texture.glb" \
  "$ROOT/outdoor-data-center"

split_glb \
  "$ROOT/Meshy_AI_Industrial_Plant_Comp_0619195706_texture.glb" \
  "$ROOT/industrial-plant-comp"

split_glb \
  "$ROOT/Meshy_AI_Windward_Island_Homes_0619195728_texture.glb" \
  "$ROOT/windward-island-homes"

# 200MW reference model (single baseColor texture; geometry.bin stays under 50 MB after Draco).
split_glb_200mw() {
  local src_glb="$1"
  local out_dir="$2"

  if [[ ! -f "$src_glb" ]]; then
    echo "Missing input: $src_glb" >&2
    exit 1
  fi

  echo "==> Splitting $(basename "$src_glb") → $out_dir"
  rm -rf "$out_dir"
  mkdir -p "$out_dir/textures"

  gltf-transform copy "$src_glb" "$out_dir/model.gltf"
  mv "$out_dir/model.bin" "$out_dir/geometry.bin"
  if [[ -f "$out_dir/baseColor.jpg" ]]; then
    mv "$out_dir/baseColor.jpg" "$out_dir/textures/baseColor.jpg"
  fi

  jq '
    .buffers[0].uri = "geometry.bin"
    | .images |= map(
        if .uri == "baseColor.jpg" then .uri = "textures/baseColor.jpg"
        else . end
      )
  ' "$out_dir/model.gltf" > "$out_dir/model.tmp.gltf"
  mv "$out_dir/model.tmp.gltf" "$out_dir/model.gltf"

  gltf-transform draco "$out_dir/model.gltf" "$out_dir/_draco.gltf"
  mv "$out_dir/_draco.gltf" "$out_dir/model.gltf"

  for jpg in "$out_dir/textures"/*.jpg; do
    [[ -f "$jpg" ]] || continue
    local webp="${jpg%.jpg}.webp"
    cwebp -q 85 "$jpg" -o "$webp" >/dev/null
    rm -f "$jpg"
  done

  jq '
    .images |= map(
      .uri |= sub("\\.jpg$"; ".webp")
      | .mimeType = "image/webp"
    )
  ' "$out_dir/model.gltf" > "$out_dir/model.tmp.gltf"
  mv "$out_dir/model.tmp.gltf" "$out_dir/model.gltf"

  echo "    geometry.bin: $(du -h "$out_dir/geometry.bin" | cut -f1)"
  echo "    textures:     $(du -sh "$out_dir/textures" | cut -f1)"
  echo "    total:        $(du -sh "$out_dir" | cut -f1)"
}

split_glb_200mw "$ROOT/200MW.glb" "$ROOT/200MWglb"
split_glb_200mw "$ROOT/500MW.glb" "$ROOT/500MW"

echo "Done. Load with: /models/<folder>/model.gltf"
