import {defineConfig} from 'vite';

const commit=(process.env.GITHUB_SHA||process.env.VITE_BEEHOP_COMMIT||'local').slice(0,8);
const buildId='v1.0.0-'+commit;
export default defineConfig({
  base:'./',
  define:{__BEEHOP_BUILD_ID__:JSON.stringify(buildId)},
  plugins:[{
    name:'embed-bee-hop-version',
    transformIndexHtml(html){return html.replaceAll('__BEEHOP_COMMIT__',commit);}
  }]
});
