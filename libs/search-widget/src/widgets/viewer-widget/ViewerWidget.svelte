<svelte:options tag="nuclia-viewer" />

<script lang="ts">
  import {
    getFieldType,
    getResourceById,
    getResourceField,
    getResultType,
    initNuclia,
    initViewer,
    isPreviewing,
    loadFonts,
    loadSvgSprite,
    resetNuclia,
    resetStatesAndEffects,
    setCDN,
    setLang,
    setWidgetActions,
    viewerData
  } from '../../core';
  import { onMount } from 'svelte';
  import type { FieldFullId, KBStates } from '@nuclia/core';
  import { ResourceProperties } from '@nuclia/core';
  import globalCss from '../../common/_global.scss?inline';
  import { forkJoin, Observable } from 'rxjs';
  import { onClosePreview, Viewer } from '../../components';

  export let backend = 'https://nuclia.cloud/api';
  export let zone = '';
  export let knowledgebox = '';
  export let lang = '';
  export let cdn = '';
  export let apikey = '';
  export let kbslug = '';
  export let account = '';
  export let client = 'widget';
  export let state: KBStates = 'PUBLISHED';
  export let standalone = false;

  export let rid = '';
  export let field_id = '';
  export let field_type = '';

  $: fieldType = getFieldType(field_type);
  $: if (rid && field_id && fieldType) {
    const fullId = {
      resourceId: rid,
      field_id,
      field_type: fieldType
    };
    openPreview(fullId);
  } else {
    closePreview();
  }

  export const setViewerMenu = setWidgetActions;

  export function openPreview(fullId: FieldFullId): Observable<boolean> {
    forkJoin([
      getResourceById(fullId.resourceId, [ResourceProperties.BASIC, ResourceProperties.VALUES]),
      getResourceField(fullId)
    ]).subscribe(([resource, fieldData]) => {
      const field = { field_id: fullId.field_id, field_type: fullId.field_type };
      viewerData.set({
        result: {
          ...resource,
          field,
          resultType: getResultType({ ...resource, field, fieldData })
        },
        selectedParagraphIndex: -1
      });
    });

    return isPreviewing;
  }

  export function closePreview() {
    onClosePreview();
  }

  export const reset = () => {
    resetNuclia();
    resetStatesAndEffects();
  };

  let svgSprite;
  let ready = false;

  onMount(() => {
    if (cdn) {
      setCDN(cdn);
    }

    initNuclia(
      {
        backend,
        zone,
        knowledgeBox: knowledgebox,
        client,
        apiKey: apikey,
        kbSlug: kbslug,
        account,
        standalone
      },
      state,
      {}
    );

    lang = lang || window.navigator.language.split('-')[0] || 'en';
    setLang(lang);

    loadFonts();
    loadSvgSprite().subscribe((sprite) => (svgSprite = sprite));
    initViewer();

    ready = true;

    return () => reset();
  });
</script>

<svelte:element this="style">{@html globalCss}</svelte:element>

<div
  class="nuclia-widget"
  data-version="__NUCLIA_DEV_VERSION__">
  {#if ready && !!svgSprite}
    <Viewer />
  {/if}

  <div
    id="nuclia-glyphs-sprite"
    hidden>
    {@html svgSprite}
  </div>
</div>

<style
  lang="scss"
  src="./ViewerWidget.scss"></style>
