package com.savanostore.installer

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

class SavanoInstallerModule : Module() {
  private val ioExecutor = Executors.newCachedThreadPool()

  private val reactContext: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context indisponível")

  override fun definition() = ModuleDefinition {
    Name("SavanoInstaller")

    Events("onDownloadProgress")

    AsyncFunction("getInstalledApps") { packageIds: List<String> ->
      val pm = reactContext.packageManager
      val result = mutableMapOf<String, Map<String, Any?>>()

      for (pkgId in packageIds) {
        val info = getPackageInfoCompat(pm, pkgId)
        if (info != null) {
          result[pkgId] = mapOf(
            "installed" to true,
            "versionCode" to PackageInfoCompat.getLongVersionCode(info),
            "versionName" to (info.versionName ?: "")
          )
        } else {
          result[pkgId] = mapOf(
            "installed" to false,
            "versionCode" to null,
            "versionName" to null
          )
        }
      }
      result
    }

    Function("canRequestPackageInstalls") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.packageManager.canRequestPackageInstalls()
      } else {
        true
      }
    }

    Function("openInstallPermissionSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val intent = Intent(
          Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
          Uri.parse("package:${reactContext.packageName}")
        ).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
      }
      true
    }

    AsyncFunction("downloadAndVerifyApk") { packageId: String, apkUrl: String, expectedSha256: String, promise: Promise ->
      ioExecutor.execute {
        downloadAndVerifyInternal(packageId, apkUrl, expectedSha256, promise)
      }
    }

    AsyncFunction("installApk") { filePath: String ->
      val context = reactContext
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
        throw CodedException("ERR_PERMISSION_REQUIRED", "Permissão para instalar apps desconhecidos não concedida.", null)
      }

      val apkFile = File(filePath)
      if (!apkFile.exists()) {
        throw CodedException("ERR_FILE_NOT_FOUND", "Arquivo APK não encontrado em $filePath", null)
      }

      val authority = "${context.packageName}.savano.fileprovider"
      val contentUri = FileProvider.getUriForFile(context, authority, apkFile)

      val installIntent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(contentUri, "application/vnd.android.package-archive")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      context.startActivity(installIntent)
      true
    }

    Function("openApp") { packageId: String ->
      val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(packageId)
      if (launchIntent != null) {
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(launchIntent)
        true
      } else {
        false
      }
    }

    AsyncFunction("getApkCacheStats") {
      val dir = getApkCacheDir()
      val files = dir.listFiles()?.filter { it.isFile } ?: emptyList()
      val totalBytes = files.sumOf { it.length() }
      mapOf(
        "fileCount" to files.size,
        "totalBytes" to totalBytes
      )
    }

    AsyncFunction("clearApkCache") {
      val dir = getApkCacheDir()
      val files = dir.listFiles()?.filter { it.isFile } ?: emptyList()
      var deletedCount = 0
      var freedBytes = 0L
      for (file in files) {
        val len = file.length()
        if (file.delete()) {
          deletedCount += 1
          freedBytes += len
        }
      }
      mapOf(
        "deletedCount" to deletedCount,
        "freedBytes" to freedBytes
      )
    }
  }

  private fun getApkCacheDir(): File {
    val dir = File(reactContext.cacheDir, "savano-apks")
    if (!dir.exists()) {
      dir.mkdirs()
    }
    return dir
  }

  private fun getPackageInfoCompat(pm: PackageManager, packageId: String): PackageInfo? {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pm.getPackageInfo(packageId, PackageManager.PackageInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.getPackageInfo(packageId, 0)
      }
    } catch (_: PackageManager.NameNotFoundException) {
      null
    }
  }

  private fun downloadAndVerifyInternal(
    packageId: String,
    apkUrl: String,
    expectedSha256: String,
    promise: Promise
  ) {
    val safeName = packageId.replace(Regex("[^a-zA-Z0-9._-]"), "_")
    val cacheDir = getApkCacheDir()
    val tempFile = File(cacheDir, "$safeName.apk.tmp")
    val targetFile = File(cacheDir, "$safeName.apk")

    var connection: HttpURLConnection? = null
    try {
      if (tempFile.exists()) tempFile.delete()

      val url = URL(apkUrl)
      if (url.protocol != "https" && url.protocol != "http") {
        promise.reject("ERR_INVALID_URL", "URL de APK inválida: $apkUrl", null)
        return
      }

      connection = (url.openConnection() as HttpURLConnection).apply {
        instanceFollowRedirects = true
        connectTimeout = 30_000
        readTimeout = 30_000
        requestMethod = "GET"
      }

      val responseCode = connection.responseCode
      if (responseCode !in 200..299) {
        promise.reject("ERR_HTTP", "Falha no download (HTTP $responseCode)", null)
        return
      }

      val totalBytes = connection.contentLengthLong
      val digest = MessageDigest.getInstance("SHA-256")
      var bytesDownloaded = 0L
      var lastEmitTime = 0L

      connection.inputStream.use { input ->
        FileOutputStream(tempFile).use { output ->
          val buffer = ByteArray(16 * 1024)
          var read: Int
          while (input.read(buffer).also { read = it } != -1) {
            output.write(buffer, 0, read)
            digest.update(buffer, 0, read)
            bytesDownloaded += read

            val now = System.currentTimeMillis()
            if (now - lastEmitTime >= 100L) {
              lastEmitTime = now
              val progress = if (totalBytes > 0L) {
                (bytesDownloaded.toDouble() / totalBytes.toDouble()).coerceIn(0.0, 1.0)
              } else {
                -1.0
              }
              sendEvent(
                "onDownloadProgress",
                mapOf(
                  "packageId" to packageId,
                  "bytesDownloaded" to bytesDownloaded,
                  "totalBytes" to totalBytes,
                  "progress" to progress,
                  "phase" to "downloading"
                )
              )
            }
          }
          output.flush()
        }
      }

      sendEvent(
        "onDownloadProgress",
        mapOf(
          "packageId" to packageId,
          "bytesDownloaded" to bytesDownloaded,
          "totalBytes" to totalBytes,
          "progress" to 1.0,
          "phase" to "verifying"
        )
      )

      val actualSha256 = digest.digest().joinToString("") { "%02x".format(it) }
      val normalizedExpected = expectedSha256.trim().lowercase()

      if (actualSha256 != normalizedExpected) {
        tempFile.delete()
        promise.reject(
          "ERR_SHA256_MISMATCH",
          "Integridade comprometida! SHA-256 esperado ($normalizedExpected) difere do arquivo baixado ($actualSha256).",
          null
        )
        return
      }

      if (targetFile.exists()) {
        targetFile.delete()
      }
      if (!tempFile.renameTo(targetFile)) {
        tempFile.copyTo(targetFile, overwrite = true)
        tempFile.delete()
      }

      promise.resolve(
        mapOf(
          "filePath" to targetFile.absolutePath,
          "sha256" to actualSha256,
          "sizeBytes" to bytesDownloaded
        )
      )
    } catch (e: Exception) {
      tempFile.delete()
      promise.reject("ERR_DOWNLOAD_FAILED", e.message ?: "Erro desconhecido ao baixar APK", e)
    } finally {
      connection?.disconnect()
    }
  }
}

private class CodedException(
  code: String,
  message: String,
  cause: Throwable?
) : expo.modules.kotlin.exception.CodedException(code, message, cause)
