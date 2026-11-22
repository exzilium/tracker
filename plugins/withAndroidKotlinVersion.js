const {
  withGradleProperties,
  withProjectBuildGradle,
} = require('@expo/config-plugins');

function setKotlinClasspath(buildGradle, kotlinVersion) {
  const pattern =
    /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]+)?['"]\)/;
  if (!pattern.test(buildGradle)) {
    throw new Error(
      'withAndroidKotlinVersion: Could not find kotlin-gradle-plugin classpath in android/build.gradle'
    );
  }
  return buildGradle.replace(
    pattern,
    `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}')`
  );
}

const withAndroidKotlinVersion = (config, props = {}) => {
  const kotlinVersion = props.kotlinVersion || '2.3.0';

  config = withGradleProperties(config, (modConfig) => {
    modConfig.modResults = modConfig.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'android.kotlinVersion')
    );
    modConfig.modResults.push({
      type: 'property',
      key: 'android.kotlinVersion',
      value: kotlinVersion,
    });
    return modConfig;
  });

  config = withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      throw new Error(
        `withAndroidKotlinVersion: Expected Groovy build.gradle, got ${modConfig.modResults.language}`
      );
    }
    modConfig.modResults.contents = setKotlinClasspath(
      modConfig.modResults.contents,
      kotlinVersion
    );
    return modConfig;
  });

  return config;
};

module.exports = withAndroidKotlinVersion;
