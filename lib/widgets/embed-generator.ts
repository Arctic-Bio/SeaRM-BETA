// SeaRM Widget Embed Code Generator
// Generates copy-paste HTML snippets for embedding widgets on external sites

export function generateEmbedCode(widgetId: string, accessToken: string, baseUrl: string, opts?: { width?: string; height?: string }): string {
  const w = opts?.width || "100%"
  const h = opts?.height || "auto"
  const endpoint = `${baseUrl}/api/widgets/embed/${widgetId}?token=${accessToken}`

  return `<!-- SeaRM Widget -->
<div id="searm-widget-${widgetId}" style="width:${w};max-width:100%;"></div>
<script>
(function(){
  var c=document.getElementById("searm-widget-${widgetId}");
  var endpoint="${endpoint}";
  var page=1;

  function load(p){
    page=p||1;
    c.innerHTML='<div style="padding:40px;text-align:center;opacity:.4">Loading...</div>';
    fetch(endpoint+"&page="+page)
      .then(function(r){return r.text()})
      .then(function(html){c.innerHTML=html;bindEvents()})
      .catch(function(){c.innerHTML='<div style="padding:20px;text-align:center;color:#ef4444">Failed to load widget</div>'});
  }

  function bindEvents(){
    var btns=c.querySelectorAll("[data-sw-page]");
    btns.forEach(function(b){b.addEventListener("click",function(){load(parseInt(b.dataset.swPage))})});
    var search=c.querySelector(".sw-search");
    if(search){var t;search.addEventListener("input",function(){clearTimeout(t);t=setTimeout(function(){
      var url=endpoint+"&page=1&search="+encodeURIComponent(search.value);
      fetch(url).then(function(r){return r.text()}).then(function(html){c.innerHTML=html;bindEvents()})
    },400)})}
  }

  load(1);
  ${opts?.height === "auto" ? "" : `\n  // Auto-refresh\n  setInterval(function(){load(page)},300000);`}
})();
</script>
<!-- End SeaRM Widget -->`
}

export function generateIframeCode(widgetId: string, accessToken: string, baseUrl: string, opts?: { width?: string; height?: string }): string {
  const w = opts?.width || "100%"
  const h = opts?.height || "400px"
  return `<!-- SeaRM Widget (iframe) -->
<iframe
  src="${baseUrl}/api/widgets/embed/${widgetId}?token=${accessToken}&iframe=1"
  width="${w}" height="${h}"
  frameborder="0" style="border:none;border-radius:8px;max-width:100%;"
  loading="lazy" title="SeaRM Widget">
</iframe>
<!-- End SeaRM Widget -->`
}
