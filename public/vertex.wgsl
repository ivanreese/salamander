const pos = array(
  vec2f(-1.0,  1.0), // top left
  vec2f( 1.0,  1.0), // top right
  vec2f(-1.0, -1.0), // bottom left
  vec2f( 1.0, -1.0), // bottom right
);

// we run the vertex shader once per vertex, per instance, and instance_index gives us which index we're on
@vertex
fn vertex(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4f {
  return vec4f(pos[vertex_index], 0.0, 1.0);
}