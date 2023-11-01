export function replaceShader() {
  _v11NewShader();
}

function _v11NewShader() {
  VisibilityFilter.fragmentShader = function (options) {
    return `
  varying vec2 vTextureCoord;
  varying vec2 vMaskTextureCoord;
  varying vec2 vOverlayCoord;
  varying vec2 vOverlayTilingCoord;
  uniform sampler2D uSampler;
  uniform sampler2D primaryTexture;
  uniform sampler2D overlayTexture;
  uniform vec3 unexploredColor;
  uniform vec3 backgroundColor;
  uniform bool hasOverlayTexture;
  ${
    options.persistentVision
      ? ``
      : `uniform sampler2D visionTexture;
   uniform vec3 exploredColor;`
  }
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
    ${
      options.persistentVision ? `` : `float v = texture2D(visionTexture, vMaskTextureCoord).r;`
    } // Vision red channel from the vision cached container
    vec4 baseColor = texture2D(primaryTexture, vMaskTextureCoord);// Primary cached container renderTexture color
    vec4 fogColor = hasOverlayTexture 
                    ? texture2D(overlayTexture, vOverlayTilingCoord) * getClip(vOverlayCoord)
                    : baseColor;      
    fogColor = unPremultiply(fogColor);
    
    // Compute fog exploration colors
    ${
      !options.persistentVision
        ? `float reflec = perceivedBrightness(baseColor.rgb);
    vec4 explored = vec4(min((exploredColor * reflec) + (baseColor.rgb * exploredColor), vec3(1.0)), 0.5);`
        : ``
    }
    vec4 unexplored = hasOverlayTexture
                      ? mix(vec4(unexploredColor, fogColor.a), vec4(fogColor.rgb * backgroundColor, 1.0), fogColor.a)
                      : vec4(unexploredColor, 1.0);

    // Mixing components to produce fog of war
    ${
      options.persistentVision
        ? `gl_FragColor = mix(unexplored, vec4(0.0), r);`
        : `vec4 fow = mix(unexplored, explored, max(r,v));
     gl_FragColor = mix(fow, vec4(0.0), v);`
    }
    
    // Output the result
    gl_FragColor.rgb *= gl_FragColor.a;
  }`;
  };
}
