//grid1 is a array of 32x32 u32 values
@group(0) @binding(0) var<storage> grid1: array<u32>;
@group(0) @binding(1) var<storage, read_write> grid2: array<u32>;

@compute @workgroup_size(1, 128, 1)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
  // duplicate the grid into grid2
  let gridValue = grid1[cell.x + cell.y];
  grid2[cell.x + cell.y] = gridValue;
}