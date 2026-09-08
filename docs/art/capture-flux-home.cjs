// Start Astro on 4335, then open a named playwright-cli session from .alkemist/.
// Run-code this file, then copy home-flux-opening.png into src/assets/home/flux-home.png.
// Capture outside the watched assets directory before copying the finished image.
// prettier-ignore
async page => {
  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4335/');
  await page.locator('form-art[data-state=ready]').waitFor();
  await page.getByLabel('Color theme').selectOption('dark');
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
  await page.waitForTimeout(150);
  await page.locator('.flux-hero').screenshot({path:'home-flux-opening.png'});
}
