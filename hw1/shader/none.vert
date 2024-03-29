#version 300 es
in vec3 a_VertexPosition;
in vec3 a_VertexNormal;
in vec3 a_VertexFrontColor;

uniform mat4 u_MVMatrix;
uniform mat4 u_PMatrix;

out vec3 fragColor;
out vec3 vertexNormal;

void main(void)
{
    fragColor = a_VertexFrontColor.rgb;
    vertexNormal = a_VertexNormal;
    gl_Position = u_PMatrix * u_MVMatrix * vec4(a_VertexPosition, 1.0);
}
