@group(0) @binding(0) var<uniform> grid: mat4x4<f32>;
  
@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u){
            
}