const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = '// [withLocalReleaseSigning]';

const RELEASE_SIGNING_BLOCK = `        ${MARKER}
        release {
            def localProps = new java.util.Properties()
            def rootLocalPropsFile = new File(projectRoot, "local.properties")
            def androidLocalPropsFile = rootProject.file("local.properties")
            if (rootLocalPropsFile.exists()) {
                rootLocalPropsFile.withInputStream { localProps.load(it) }
            } else if (androidLocalPropsFile.exists()) {
                androidLocalPropsFile.withInputStream { localProps.load(it) }
            }
            def propOrEnv = { String name ->
                (localProps.getProperty(name) ?: System.getenv(name) ?: "").trim()
            }
            def keystorePath = propOrEnv("KEYSTORE_FILE")
            if (keystorePath && file(keystorePath).exists()) {
                storeFile file(keystorePath)
                storePassword propOrEnv("KEYSTORE_PASSWORD")
                keyAlias propOrEnv("KEY_ALIAS")
                keyPassword propOrEnv("KEY_PASSWORD")
            }
        }`;

const RELEASE_BUILD_TYPE_SIGNING = `            ${MARKER}
            if (signingConfigs.release.storeFile != null) {
                signingConfig signingConfigs.release
            } else {
                logger.warn("WARNING: KEYSTORE_FILE not configured in local.properties; falling back to debug signing.")
                signingConfig signingConfigs.debug
            }`;

function applyLocalReleaseSigning(buildGradle) {
  if (buildGradle.includes(MARKER)) {
    return buildGradle;
  }

  const debugSigningEndPattern =
    /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n\s*\})(\n\s*\})/;
  if (!debugSigningEndPattern.test(buildGradle)) {
    throw new Error(
      'withLocalReleaseSigning: Could not find expected signingConfigs.debug block in android/app/build.gradle'
    );
  }

  let updated = buildGradle.replace(
    debugSigningEndPattern,
    `$1\n${RELEASE_SIGNING_BLOCK}$2`
  );

  const releaseBuildTypePattern =
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)[ \t]*signingConfig signingConfigs\.debug/;
  if (!releaseBuildTypePattern.test(updated)) {
    throw new Error(
      'withLocalReleaseSigning: Could not find expected buildTypes.release signingConfig in android/app/build.gradle'
    );
  }

  updated = updated.replace(
    releaseBuildTypePattern,
    `$1${RELEASE_BUILD_TYPE_SIGNING}`
  );

  return updated;
}

const withLocalReleaseSigning = (config) => {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      throw new Error(
        `withLocalReleaseSigning: Expected Groovy build.gradle, got ${modConfig.modResults.language}`
      );
    }
    modConfig.modResults.contents = applyLocalReleaseSigning(
      modConfig.modResults.contents
    );
    return modConfig;
  });
};

withLocalReleaseSigning.applyLocalReleaseSigning = applyLocalReleaseSigning;
module.exports = withLocalReleaseSigning;
