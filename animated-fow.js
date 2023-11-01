import { replaceShader } from './shaders.js';

const DEFAULT_FILTER = [
  {
    filterType: 'fog',
    filterId: 'fowFilter',
    color: 0x000000,
    density: 0.65,
    time: 0,
    dimX: 1,
    dimY: 1,
    animated: {
      time: {
        active: true,
        speed: 0.1,
        animType: 'move',
      },
    },
  },
];

Hooks.on('init', replaceShader);

Hooks.on('renderSceneConfig', (app) => {
  let applyFilter = app.document.getFlag('aedifs-animated-fow', 'applyFilter');

  let filter = decodeURIComponent(
    app.document.getFlag('aedifs-animated-fow', 'filter') ?? JSON.stringify(DEFAULT_FILTER)
  );

  let controls = `
<fieldset>
  <legend>Aedif's Animated FOW</legend>
  <div class="form-group">
    <label>Apply Filter</label>
    <input type="checkbox" name="flags.aedifs-animated-fow.applyFilter" ${
      applyFilter ? 'checked' : ''
    }>
  </div>
  <div class="form-group">
    <label>TMFX Filter</label>
    <div class="form-fields">      
      <button type="button" class="filterEdit" title="TMFX Filter" tabindex="-1"><i class="fas fa-book-spells"></i></button>
      <input type="text" class="fowFilter" name="flags.aedifs-animated-fow.filter" value="${encodeURIComponent(
        filter
      )}" hidden>
    </div>
  </div>
</fieldset>`;

  $(app.form).find('[name="fogOverlay"]').closest('.form-group').after(controls);
  $(app.form).find('.filterEdit').on('click', showFilterEdit);
  app.setPosition();
});

function showFilterEdit(event) {
  const filterInput = $(event.target).closest('.form-group').find('.fowFilter');

  let filter;
  try {
    filter = JSON.stringify(eval(decodeURIComponent(filterInput.val())), null, 2);
  } catch (e) {
    console.log(e);
    filter = '';
  }

  let content = `<textarea class="json" style="height:500px;">${filter}</textarea>`;

  new Dialog({
    title: 'Edit Filter',
    content: content,
    buttons: {
      select: {
        label: 'Apply',
        callback: (html) => {
          filterInput.val(encodeURIComponent(html.find('.json').val()));
        },
      },
      reset: {
        label: 'Reset',
        callback: () => {
          filterInput.val(encodeURIComponent(JSON.stringify(DEFAULT_FILTER)));
        },
      },
    },
  }).render(true);
}

async function applyFilters(sceneId) {
  if (!canvas.scene?.id === sceneId) return;
  if (!('filterTypes' in TokenMagic)) return;

  if (canvas.effects?.visibility?.filters) {
    let filters = [];
    canvas.effects.visibility.filters.forEach((f) => {
      if (!f.fowFilter) filters.push(f);
    });
    canvas.effects.visibility.filters = filters;
  }

  if (!canvas.scene.getFlag('aedifs-animated-fow', 'applyFilter')) return;

  let paramsArray = canvas.scene.getFlag('aedifs-animated-fow', 'filter');
  try {
    paramsArray = eval(decodeURIComponent(paramsArray));
  } catch (e) {
    paramsArray = [];
  }
  if (!Array.isArray(paramsArray) || !paramsArray.length) return;

  let filters = [];
  for (const params of paramsArray) {
    if (
      !params.hasOwnProperty('filterType') ||
      !TMFXFilterTypes.hasOwnProperty(params.filterType)
    ) {
      // one invalid ? all rejected.
      return [];
    }

    if (!params.hasOwnProperty('rank')) {
      params.rank = 5000;
    }

    if (!params.hasOwnProperty('filterId') || params.filterId == null) {
      params.filterId = randomID();
    }

    if (!params.hasOwnProperty('enabled') || !(typeof params.enabled === 'boolean')) {
      params.enabled = true;
    }

    params.filterInternalId = randomID();

    const gms = game.users.filter((user) => user.isGM);
    params.filterOwner = gms.length ? gms[0].id : game.data.userId;
    params.updateId = randomID();

    const filterClass = TokenMagic.filterTypes?.[params.filterType];
    if (filterClass) {
      filterClass.prototype.assignPlaceable = function () {
        this.targetPlaceable = canvas.effects;
        this.placeableImg = canvas.effects.visibility;
      };

      filterClass.prototype._TMFXsetAnimeFlag = async function () {};

      const filter = new filterClass(params);
      if (filter) {
        // Patch fixes
        filter.placeableImg = canvas.effects.visibility;
        filter.targetPlaceable = canvas.effects;
        filter.fowFilter = true;
        // end of fixes
        filters.unshift(filter);
      }
    }
  }

  canvas.effects.visibility.filters = canvas.effects.visibility.filters.concat(filters);
}

Hooks.on('updateScene', (scene, change) => {
  if (change.flags?.['aedifs-animated-fow']) applyFilters(scene.id);
});

Hooks.on('ready', () => {
  Hooks.once('drawCanvasVisibility', async () => {
    applyFilters(canvas.scene.id);
  });
  applyFilters(canvas.scene.id);
});

async function getTMFXFilter(id) {
  return TokenMagic.filterTypes()?.[id];
}

const LOADED_TMFXFilters = {};

const TMFXFilterTypes = {
  adjustment: 'FilterAdjustment',
  distortion: 'FilterDistortion',
  oldfilm: 'FilterOldFilm',
  glow: 'FilterGlow',
  outline: 'FilterOutline',
  bevel: 'FilterBevel',
  xbloom: 'FilterXBloom',
  shadow: 'FilterDropShadow',
  twist: 'FilterTwist',
  zoomblur: 'FilterZoomBlur',
  blur: 'FilterBlur',
  bulgepinch: 'FilterBulgePinch',
  zapshadow: 'FilterRemoveShadow',
  ray: 'FilterRays',
  fog: 'FilterFog',
  xfog: 'FilterXFog',
  electric: 'FilterElectric',
  wave: 'FilterWaves',
  shockwave: 'FilterShockwave',
  fire: 'FilterFire',
  fumes: 'FilterFumes',
  smoke: 'FilterSmoke',
  flood: 'FilterFlood',
  images: 'FilterMirrorImages',
  field: 'FilterForceField',
  xray: 'FilterXRays',
  liquid: 'FilterLiquid',
  xglow: 'FilterGleamingGlow',
  pixel: 'FilterPixelate',
  web: 'FilterSpiderWeb',
  ripples: 'FilterSolarRipples',
  globes: 'FilterGlobes',
  transform: 'FilterTransform',
  splash: 'FilterSplash',
  polymorph: 'FilterPolymorph',
  xfire: 'FilterXFire',
  sprite: 'FilterSprite',
  replaceColor: 'FilterReplaceColor',
  ddTint: 'FilterDDTint',
};
