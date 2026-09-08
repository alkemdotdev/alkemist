# GitLab Pages

The generated `.gitlab-ci.yml` targets GitLab 17.10+ and works on the Free tier: the default branch publishes Pages, and other branches and merge requests validate the site without replacing production.

1. Run `npm install` and `npm run verify` locally. Create your own GitLab repository and commit the source, `vendor/*.tgz`, and `package-lock.json`.
2. Enable an eligible CI runner and Pages for the project. The pipeline uses `node:24`, runs `npm ci && npm run verify`, and publishes `dist/` through `pages.publish`.
3. By default, the build derives origin and base path from the job's `CI_PAGES_URL`. This supports both unique Pages domains and traditional `/project/` paths. For a production custom domain, set `SITE_URL` to its origin and `BASE_PATH` to its path, normally `/`.
4. Configure the domain under the project's Pages settings and complete its DNS verification/TLS steps. Inspect the live page, labs, and `build.json` under the deployed base path.

## Optional parallel previews · Premium or Ultimate

Parallel Pages deployments require Premium/Ultimate and available namespace deployment slots. The starter includes `hosting/gitlab-preview.yml` as an opt-in job template. After confirming eligibility, add it as a local include in `.gitlab-ci.yml`:

```yaml
include:
  - local: '/hosting/gitlab-preview.yml'
```

It publishes merge-request previews at the distinct `mr-<iid>` prefix for one week. Opening an MR from a branch provides its preview; ordinary branch pipelines remain validation-only. Production is unchanged. `CI_PAGES_URL` already includes that prefix, so the build derives the preview base from it rather than appending the prefix again. Preview HTML and robots.txt request no indexing.

Do not enable the parallel job on an unsupported plan. GitLab's Free tier does not provide these parallel hosted previews; validation artifacts and a separate preview provider are alternatives that need explicit setup.

Sources: [Pages YAML](https://docs.gitlab.com/ci/yaml/#pagespublish), [predefined variables](https://docs.gitlab.com/ci/variables/predefined_variables/), [parallel deployments and tier requirements](https://docs.gitlab.com/user/project/pages/parallel_deployments/).
