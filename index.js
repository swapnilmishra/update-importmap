// @ts-check
const fs = require("fs");
const path = require("path");
const https = require("https");

const importMapFilePath = path.resolve(process.cwd(), "importmap.json");
const importMap = JSON.parse(fs.readFileSync(importMapFilePath).toString());
const envVars = {
  PUBLIC_CDN_URL: process.env.PUBLIC_CDN_URL,
  CI_PROJECT_NAME: process.env.CI_PROJECT_NAME,
  CI_COMMIT_SHORT_SHA: process.env.CIRCLE_SHA1,
  ORG_NAME: process.env.ORG_NAME,
};

const fileUrl = `${envVars.PUBLIC_CDN_URL}/${envVars.CI_PROJECT_NAME}/dist/${envVars.CI_COMMIT_SHORT_SHA}/${envVars.ORG_NAME}-${envVars.CI_PROJECT_NAME}.js`;

console.log(`file url => ${fileUrl}`);

checkEnv(envVars);

https
  .get(fileUrl, (res) => {
    // HTTP redirects (301, 302, etc) not currently supported, but could be added
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (
        res.headers["content-type"] &&
        res.headers["content-type"].toLowerCase().trim() ===
          "application/javascript"
      ) {
        const moduleName = `@${envVars.ORG_NAME}/${envVars.CI_PROJECT_NAME}`;
        importMap.imports[moduleName] = fileUrl;
        fs.writeFileSync(importMapFilePath, JSON.stringify(importMap, null, 2));
        console.log(
          `Updated import map for module ${moduleName}. New url is ${fileUrl}.`
        );
      } else {
        urlNotDownloadable(
          fileUrl,
          Error(`Content-Type response header must be application/javascript`)
        );
      }
    } else {
      urlNotDownloadable(
        fileUrl,
        Error(`HTTP response status was ${res.statusCode}`)
      );
    }
  })
  .on("error", (err) => {
    urlNotDownloadable(fileUrl, err);
  });

function urlNotDownloadable(url, err) {
  throw Error(
    `Refusing to update import map - could not download javascript file at url ${url}. Error was '${err.message}'`
  );
}

function checkEnv(envVars) {
  const envVarKeys = Object.keys(envVars);

  envVarKeys.forEach((envVarKey) => {
    if (!envVars[envVarKey]) {
      throw Error(`No value set for environment variable ${envVarKey}`);
    } else {
      console.log(`${envVarKey} => ${envVars[envVarKey]}`);
    }
  });
}
