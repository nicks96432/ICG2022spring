#version 300 es
precision highp float;

uniform float u_Ka;
uniform float u_Kd;
uniform float u_Ks;
uniform float u_alpha;

struct Light {
    vec3 position;
    vec3 color;
};

uniform Light u_lights[3];

in vec3 fragColor;
in vec3 transformedVertexPosition;
in vec3 transformedVertexNormal;
out vec4 outColor;

void main(void)
{
    // ambient light
    vec3 color = u_Ka * fragColor;

    // diffuse reflection & specular reflection
    vec3 cameraDirection = normalize(transformedVertexPosition);

    for (int i = 0; i < 3; i++)
    {
        vec3 lightDirection = normalize(u_lights[i].position - transformedVertexPosition);
        color += u_Kd * max(dot(lightDirection, transformedVertexNormal), 0.0) * fragColor * u_lights[i].color;

        vec3 reflectDirection = reflect(-lightDirection, transformedVertexNormal);
        color += u_Ks * pow(max(dot(reflectDirection, -cameraDirection), 0.0), u_alpha) * u_lights[i].color;
    }

    outColor = vec4(color, 1.0);
}
