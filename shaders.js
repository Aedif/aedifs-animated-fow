export function replaceShader() {
  if (game.version.startsWith('10')) _v10Shader();
  else _v11Shader();
}

function _v10Shader() {
  VisibilityFilter.fragmentShader = `
    varying vec2 vTextureCoord;
    varying vec2 vMaskTextureCoord;
    varying vec2 vFogOverlayCoord;
    varying vec2 vFogOverlayTilingCoord;
    uniform sampler2D uSampler;
    uniform sampler2D visionTexture;
    uniform sampler2D primaryTexture;
    uniform sampler2D fogTexture;
    uniform vec3 exploredColor;
    uniform vec3 unexploredColor;
    uniform vec3 backgroundColor;
    uniform bool hasFogTexture;
    ${VisibilityFilter.CONSTANTS}
    ${VisibilityFilter.PERCEIVED_BRIGHTNESS}
    
    // To check if we are out of the bound
    float getClip(in vec2 uv) {
      return step(3.5,
         step(0.0, uv.x) +
         step(0.0, uv.y) +
         step(uv.x, 1.0) +
         step(uv.y, 1.0));
    }
    
    // Unpremultiply fog texture
    vec4 unPremultiply(in vec4 pix) {
      if ( !hasFogTexture || (pix.a == 0.0) ) return pix;
      return vec4(pix.rgb / pix.a, pix.a);
    }
    
    void main() {
      float r = texture2D(uSampler, vTextureCoord).r;               // Revealed red channel from the filter texture
      float v = texture2D(visionTexture, vMaskTextureCoord).r;      // Vision red channel from the vision cached container
      vec4 baseColor = texture2D(primaryTexture, vMaskTextureCoord);// Primary cached container renderTexture color
      vec4 fogColor = hasFogTexture 
                      ? texture2D(fogTexture, vFogOverlayTilingCoord) * getClip(vFogOverlayCoord)
                      : baseColor;      
      fogColor = unPremultiply(fogColor);
      
      // Compute explored and unexplored colors
      float reflec = perceivedBrightness(baseColor.rgb);
      vec4 explored = vec4(min((exploredColor * reflec) + (baseColor.rgb * exploredColor), vec3(1.0)), 0.5);
      vec4 unexplored = hasFogTexture
                        ? mix(vec4(unexploredColor, fogColor.a), vec4(fogColor.rgb * backgroundColor, 1.0), fogColor.a)
                        : vec4(unexploredColor, 1.0);
    
      // Mixing components to produce fog of war
      vec4 fow = mix(unexplored, explored, max(r,v));
      gl_FragColor = mix(fow, vec4(0.0), v);
      gl_FragColor.rgb *= gl_FragColor.a;
    }`;
}

function _v11Shader() {
  VisibilityFilter.fragmentShader = `
    varying vec2 vTextureCoord;
    varying vec2 vMaskTextureCoord;
    varying vec2 vOverlayCoord;
    varying vec2 vOverlayTilingCoord;
    uniform sampler2D uSampler;
    uniform sampler2D visionTexture;
    uniform sampler2D primaryTexture;
    uniform sampler2D overlayTexture;
    uniform vec3 exploredColor;
    uniform vec3 unexploredColor;
    uniform vec3 backgroundColor;
    uniform bool hasOverlayTexture;
    ${VisibilityFilter.CONSTANTS}
    ${VisibilityFilter.PERCEIVED_BRIGHTNESS}
    
    // To check if we are out of the bound
    float getClip(in vec2 uv) {
      return step(3.5,
         step(0.0, uv.x) +
         step(0.0, uv.y) +
         step(uv.x, 1.0) +
         step(uv.y, 1.0));
    }
    
    // Unpremultiply fog texture
    vec4 unPremultiply(in vec4 pix) {
      if ( !hasOverlayTexture || (pix.a == 0.0) ) return pix;
      return vec4(pix.rgb / pix.a, pix.a);
    }
    
    void main() {
      float r = texture2D(uSampler, vTextureCoord).r;               // Revealed red channel from the filter texture
      float v = texture2D(visionTexture, vMaskTextureCoord).r;      // Vision red channel from the vision cached container
      vec4 baseColor = texture2D(primaryTexture, vMaskTextureCoord);// Primary cached container renderTexture color
      vec4 fogColor = hasOverlayTexture 
                      ? texture2D(overlayTexture, vOverlayTilingCoord) * getClip(vOverlayCoord)
                      : baseColor;    
      fogColor = unPremultiply(fogColor);
      
      // Compute explored and unexplored colors
      float reflec = perceivedBrightness(baseColor.rgb);
      vec4 explored = vec4(min((exploredColor * reflec) + (baseColor.rgb * exploredColor), vec3(1.0)), 0.5);
      vec4 unexplored = hasOverlayTexture
                        ? mix(vec4(unexploredColor, fogColor.a), vec4(fogColor.rgb * backgroundColor, 1.0), fogColor.a)
                        : vec4(unexploredColor, 1.0);
    
      // Mixing components to produce fog of war
      vec4 fow = mix(unexplored, explored, max(r,v));
      gl_FragColor = mix(fow, vec4(0.0), v);
      gl_FragColor.rgb *= gl_FragColor.a;
    }`;
}
