#version 300 es
in vec3 a_VertexFrontColor;
in vec3 a_VertexNormal;
in vec3 a_VertexPosition;

uniform mat4 u_MVMatrix;
uniform mat4 u_PMatrix;

out vec3 fragColor;
out vec3 transformedVertexPosition;
out vec3 transformedVertexNormal;

void main(void)
{
    fragColor = a_VertexFrontColor;
    transformedVertexPosition = (u_MVMatrix * vec4(a_VertexPosition, 1.0)).xyz;
    transformedVertexNormal = normalize(mat3(u_MVMatrix) * a_VertexNormal);

    gl_Position = u_PMatrix * u_MVMatrix * vec4(a_VertexPosition, 1.0);
}
