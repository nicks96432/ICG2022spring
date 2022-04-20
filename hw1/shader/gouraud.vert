#version 300 es
in vec3 a_VertexFrontColor;
in vec3 a_VertexNormal;
in vec3 a_VertexPosition;

uniform mat4 u_MVMatrix;
uniform mat4 u_PMatrix;

uniform float u_Ka;
uniform float u_Kd;
uniform float u_Ks;
uniform float u_alpha;

struct Light {
	vec3 position;
    vec3 color;
};

uniform Light u_lights[3];

out vec3 fragColor;

void main(void)
{
	// ambient light
    vec3 color = u_Ka * a_VertexFrontColor;
	
    // diffuse reflection & specular reflection
	vec3 transformedVertexPosition = (u_MVMatrix * vec4(a_VertexPosition, 1.0)).xyz;
    vec3 transformedVertexNormal = normalize(mat3(u_MVMatrix) * a_VertexNormal);
    vec3 cameraDirection = normalize(transformedVertexPosition);

    for (int i = 0; i < 3; i++)
    {
        vec3 lightDirection = normalize(u_lights[i].position - transformedVertexPosition);
        color += u_Kd * max(dot(lightDirection, transformedVertexNormal), 0.0) * a_VertexFrontColor * u_lights[i].color;

        vec3 reflectDirection = reflect(-lightDirection, transformedVertexNormal);
        color += u_Ks * pow(max(dot(reflectDirection, cameraDirection), 0.0), u_alpha) * u_lights[i].color;
    }

    fragColor = color;
    gl_Position = u_PMatrix * u_MVMatrix * vec4(a_VertexPosition, 1.0);
}
