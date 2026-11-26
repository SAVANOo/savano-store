const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require('@expo/config-plugins');

const SIGNING_LOAD_SNIPPET = `
def savanoKeystorePropertiesFile = rootProject.file("../keystore.properties")
def savanoKeystoreProperties = new Properties()
if (savanoKeystorePropertiesFile.exists()) {
    savanoKeystoreProperties.load(new FileInputStream(savanoKeystorePropertiesFile))
}
`;

const SIGNING_CONFIG_SNIPPET = `
        release {
            if (savanoKeystorePropertiesFile.exists()) {
                storeFile file(savanoKeystoreProperties['storeFile'])
                storePassword savanoKeystoreProperties['storePassword']
                keyAlias savanoKeystoreProperties['keyAlias']
                keyPassword savanoKeystoreProperties['keyPassword']
            }
        }
`;

const PROGUARD_RULES = `
# Savano Store - R8 / ProGuard rules
-keep class com.savanostore.installer.** { *; }
-keepclassmembers class com.savanostore.installer.** { *; }
-keepattributes Signature,InnerClasses,EnclosingMethod
`;

function withSavanoReleaseConfig(config) {
  config = withGradleProperties(config, (mod) => {
    const props = mod.modResults;
    const ensureProp = (name, value) => {
      const existing = props.find((p) => p.type === 'property' && p.key === name);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key: name, value });
      }
    };
    ensureProp('android.overridePathCheck', 'true');
    ensureProp('org.gradle.jvmargs', '-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8');
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    if (!contents.includes('savanoKeystorePropertiesFile')) {
      contents = contents.replace(
        /android\s*\{/,
        `${SIGNING_LOAD_SNIPPET}\nandroid {`
      );
    }

    if (!contents.includes('savanoKeystoreProperties[\'storeFile\']')) {
      contents = contents.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {\n${SIGNING_CONFIG_SNIPPET}`
      );
    }

    // Update only inside the buildTypes.release block
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      '$1signingConfig savanoKeystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug'
    );

    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)def enableShrinkResources[\s\S]*?minifyEnabled\s+enableMinifyInReleaseBuilds/,
      '$1shrinkResources true\n            minifyEnabled true'
    );

    mod.modResults.contents = contents;
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const proguardPath = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      if (fs.existsSync(proguardPath)) {
        const current = fs.readFileSync(proguardPath, 'utf8');
        if (!current.includes('com.savanostore.installer')) {
          fs.writeFileSync(proguardPath, `${current}\n${PROGUARD_RULES}`, 'utf8');
        }
      }
      return mod;
    },
  ]);

  return config;
}

module.exports = withSavanoReleaseConfig;
