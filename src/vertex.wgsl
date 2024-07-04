// we run the vertex shader once per vertex, per instance, and instance_index gives us which index we're on
@vertex
fn vertex(@builtin(vertex_index) id: u32) -> @builtin(position) vec4f {
  var pos = array(
    vec2f(-1.0,  3.0), // top left
    vec2f( 3.0, -1.0), // bottom right
    vec2f(-1.0, -1.0), // bottom left
  );

  return vec4f(pos[id], 0.0, 1.0);
}