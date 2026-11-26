package com.savanostore.installer

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.Signature
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
import java.net.InetAddress
import java.net.URL
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature as JavaSignature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import java.util.concurrent.Executors

class SavanoInstallerModule : Module() {
  private val ioExecutor = Executors.newCachedThreadPool()

  private val reactContext: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context indisponível")

  private val isDebuggable: Boolean
    get() = (reactContext.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

  override fun definition() = ModuleDefinition {
    Name("SavanoInstaller")

    Events("onDownloadProgress")

    Function("getDeviceCapabilities") {
      mapOf(
        "sdkInt" to Build.VERSION.SDK_INT,
        "supportedAbis" to Build.SUPPORTED_ABIS.toList()
      )
    }

    Function("verifyCatalogSignature") { rawJson: String, signatureBase64: String, publicKeyPem: String ->
      try {
        val cleanedPem = publicKeyPem
          .replace("-----BEGIN PUBLIC KEY-----", "")
          .replace("-----END PUBLIC KEY-----", "")
          .replace(Regex("\\s+"), "")
        val keyBytes = Base64.getDecoder().decode(cleanedPem)
        val pubKey = KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(keyBytes))
        val verifier = JavaSignature.getInstance("SHA256withRSA")
        verifier.initVerify(pubKey)
        verifier.update(rawJson.toByteArray(Charsets.UTF_8))
        verifier.verify(Base64.getDecoder().decode(signatureBase64.trim()))
      } catch (_: Exception) {
        false
      }
    }

    AsyncFunction("getInstalledApps") { packageIds: List<String> ->
      val pm = reactContext.packageManager
      val result = mutableMapOf<String, Map<String, Any?>>()

      for (pkgId in packageIds) {
        val info = getPackageInfoCompat(pm, pkgId, includeSigners = false)
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

    Function("openAppSettings") { packageId: String ->
      val intent = Intent(
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:$packageId")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      true
    }

    AsyncFunction("downloadAndVerifyApk") {
      packageId: String,
      apkUrl: String,
      expectedSha256: String,
      expectedSizeBytes: Long,
      expectedVersionCode: Long,
      expectedSignerSha256: String?,
      promise: Promise ->
      ioExecutor.execute {
        downloadAndVerifyInternal(
          packageId = packageId,
          apkUrl = apkUrl,
          expectedSha256 = expectedSha256,
          expectedSizeBytes = expectedSizeBytes,
          expectedVersionCode = expectedVersionCode,
          expectedSignerSha256 = expectedSignerSha256,
          promise = promise
        )
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

    AsyncFunction("deleteCachedApk") { packageId: String ->
      val safeName = sanitizePackageName(packageId)
      val cacheDir = getApkCacheDir()
      val apk = File(cacheDir, "$safeName.apk")
      val tmp = File(cacheDir, "$safeName.apk.tmp")
      var deleted = false
      if (apk.exists()) deleted = apk.delete() || deleted
      if (tmp.exists()) deleted = tmp.delete() || deleted
      deleted
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

  private fun sanitizePackageName(packageId: String): String {
    return packageId.replace(Regex("[^a-zA-Z0-9._-]"), "_")
  }

  private fun getApkCacheDir(): File {
    val dir = File(reactContext.cacheDir, "savano-apks")
    if (!dir.exists()) {
      dir.mkdirs()
    }
    return dir
  }

  private fun getSigningFlags(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      PackageManager.GET_SIGNING_CERTIFICATES
    } else {
      @Suppress("DEPRECATION")
      PackageManager.GET_SIGNATURES
    }
  }

  private fun getPackageInfoCompat(
    pm: PackageManager,
    packageId: String,
    includeSigners: Boolean
  ): PackageInfo? {
    val flags = if (includeSigners) getSigningFlags() else 0
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pm.getPackageInfo(packageId, PackageManager.PackageInfoFlags.of(flags.toLong()))
      } else {
        @Suppress("DEPRECATION")
        pm.getPackageInfo(packageId, flags)
      }
    } catch (_: PackageManager.NameNotFoundException) {
      null
    }
  }

  private fun getPackageArchiveInfoCompat(pm: PackageManager, apkPath: String): PackageInfo? {
    val flags = getSigningFlags()
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.getPackageArchiveInfo(apkPath, PackageManager.PackageInfoFlags.of(flags.toLong()))
    } else {
      @Suppress("DEPRECATION")
      pm.getPackageArchiveInfo(apkPath, flags)
    }
  }

  private fun extractSignerSha256s(info: PackageInfo): Set<String> {
    val signatures: Array<Signature> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      val signingInfo = info.signingInfo ?: return emptySet()
      if (signingInfo.hasMultipleSigners()) {
        signingInfo.apkContentsSigners
      } else {
        signingInfo.signingCertificateHistory
      }
    } else {
      @Suppress("DEPRECATION")
      info.signatures ?: emptyArray()
    }

    val digest = MessageDigest.getInstance("SHA-256")
    return signatures.map { sig ->
      digest.reset()
      digest.update(sig.toByteArray())
      digest.digest().joinToString("") { "%02x".format(it) }
    }.toSet()
  }

  private fun isAllowedHost(host: String): Boolean {
    val lower = host.lowercase()
    if (isDebuggable) return true
    return lower == "github.com" ||
      lower.endsWith(".github.com") ||
      lower.endsWith(".githubusercontent.com") ||
      lower == "savanoo.github.io"
  }

  private fun validateUrlAndResolve(urlString: String): URL {
    val url = URL(urlString)
    val protocol = url.protocol.lowercase()
    if (protocol != "https" && !(isDebuggable && protocol == "http")) {
      throw SecurityException("Download bloqueado: apenas HTTPS é permitido ($urlString).")
    }

    val host = url.host ?: throw SecurityException("URL sem host válido.")
    if (!isAllowedHost(host)) {
      throw SecurityException("Host não autorizado para download de APK: $host")
    }

    if (!isDebuggable) {
      val addresses = InetAddress.getAllByName(host)
      for (addr in addresses) {
        if (addr.isLoopbackAddress || addr.isSiteLocalAddress || addr.isLinkLocalAddress || addr.isAnyLocalAddress) {
          throw SecurityException("Endereço de rede privado/local bloqueado para $host.")
        }
      }
    }
    return url
  }

  private fun openValidatedConnection(initialUrl: String): HttpURLConnection {
    var currentUrl = initialUrl
    for (hop in 0..5) {
      val url = validateUrlAndResolve(currentUrl)
      val conn = (url.openConnection() as HttpURLConnection).apply {
        instanceFollowRedirects = false
        connectTimeout = 30_000
        readTimeout = 30_000
        requestMethod = "GET"
      }

      val code = conn.responseCode
      if (code in listOf(301, 302, 303, 307, 308)) {
        val location = conn.getHeaderField("Location")
        conn.disconnect()
        if (location.isNullOrBlank()) {
          throw IllegalStateException("Redirect sem cabeçalho Location (HTTP $code)")
        }
        currentUrl = URL(url, location).toString()
        continue
      }

      if (code !in 200..299) {
        conn.disconnect()
        throw IllegalStateException("Falha no download (HTTP $code)")
      }
      return conn
    }
    throw IllegalStateException("Excesso de redirecionamentos ao baixar APK.")
  }

  private fun downloadAndVerifyInternal(
    packageId: String,
    apkUrl: String,
    expectedSha256: String,
    expectedSizeBytes: Long,
    expectedVersionCode: Long,
    expectedSignerSha256: String?,
    promise: Promise
  ) {
    val safeName = sanitizePackageName(packageId)
    val cacheDir = getApkCacheDir()
    val tempFile = File(cacheDir, "$safeName.apk.tmp")
    val targetFile = File(cacheDir, "$safeName.apk")

    var connection: HttpURLConnection? = null
    try {
      if (tempFile.exists()) tempFile.delete()

      connection = openValidatedConnection(apkUrl)
      val totalBytes = connection.contentLengthLong

      if (expectedSizeBytes > 0L && totalBytes > 0L && totalBytes != expectedSizeBytes) {
        promise.reject(
          "ERR_SIZE_MISMATCH",
          "Tamanho informado pelo servidor ($totalBytes B) difere do catálogo ($expectedSizeBytes B).",
          null
        )
        return
      }

      val digest = MessageDigest.getInstance("SHA-256")
      var bytesDownloaded = 0L
      var lastEmitTime = 0L

      connection.inputStream.use { input ->
        FileOutputStream(tempFile).use { output ->
          val buffer = ByteArray(16 * 1024)
          var read: Int
          while (input.read(buffer).also { read = it } != -1) {
            bytesDownloaded += read
            if (expectedSizeBytes > 0L && bytesDownloaded > expectedSizeBytes) {
              throw SecurityException(
                "Download excedeu o tamanho esperado ($expectedSizeBytes B). Operação abortada."
              )
            }
            output.write(buffer, 0, read)
            digest.update(buffer, 0, read)

            val now = System.currentTimeMillis()
            if (now - lastEmitTime >= 100L) {
              lastEmitTime = now
              val denom = if (totalBytes > 0L) totalBytes else expectedSizeBytes
              val progress = if (denom > 0L) {
                (bytesDownloaded.toDouble() / denom.toDouble()).coerceIn(0.0, 1.0)
              } else {
                -1.0
              }
              sendEvent(
                "onDownloadProgress",
                mapOf(
                  "packageId" to packageId,
                  "bytesDownloaded" to bytesDownloaded,
                  "totalBytes" to denom,
                  "progress" to progress,
                  "phase" to "downloading"
                )
              )
            }
          }
          output.flush()
        }
      }

      if (expectedSizeBytes > 0L && bytesDownloaded != expectedSizeBytes) {
        tempFile.delete()
        promise.reject(
          "ERR_SIZE_MISMATCH",
          "Tamanho baixado ($bytesDownloaded B) difere do esperado ($expectedSizeBytes B).",
          null
        )
        return
      }

      sendEvent(
        "onDownloadProgress",
        mapOf(
          "packageId" to packageId,
          "bytesDownloaded" to bytesDownloaded,
          "totalBytes" to bytesDownloaded,
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

      // Validação de manifesto e certificado de assinatura do APK baixado
      val pm = reactContext.packageManager
      val archiveInfo = getPackageArchiveInfoCompat(pm, tempFile.absolutePath)
      if (archiveInfo == null) {
        tempFile.delete()
        promise.reject("ERR_INVALID_APK", "Não foi possível ler o manifesto do APK baixado.", null)
        return
      }

      if (archiveInfo.packageName != packageId) {
        tempFile.delete()
        promise.reject(
          "ERR_PACKAGE_MISMATCH",
          "O APK baixado pertence a '${archiveInfo.packageName}', esperado '$packageId'.",
          null
        )
        return
      }

      val archiveVersionCode = PackageInfoCompat.getLongVersionCode(archiveInfo)
      if (expectedVersionCode > 0L && archiveVersionCode != expectedVersionCode) {
        tempFile.delete()
        promise.reject(
          "ERR_VERSION_MISMATCH",
          "versionCode do APK ($archiveVersionCode) difere do catálogo ($expectedVersionCode).",
          null
        )
        return
      }

      val archiveSigners = extractSignerSha256s(archiveInfo)
      if (archiveSigners.isEmpty()) {
        tempFile.delete()
        promise.reject("ERR_UNSIGNED_APK", "O APK baixado não possui assinatura válida.", null)
        return
      }

      val normalizedExpectedSigner = expectedSignerSha256?.trim()?.lowercase().orEmpty()
      if (normalizedExpectedSigner.isNotEmpty() && normalizedExpectedSigner !in archiveSigners) {
        tempFile.delete()
        promise.reject(
          "ERR_SIGNER_MISMATCH",
          "Certificado de assinatura do APK não confere com o signerSha256 do catálogo.",
          null
        )
        return
      }

      val installedInfo = getPackageInfoCompat(pm, packageId, includeSigners = true)
      if (installedInfo != null) {
        val installedSigners = extractSignerSha256s(installedInfo)
        if (installedSigners.isNotEmpty() && installedSigners.intersect(archiveSigners).isEmpty()) {
          tempFile.delete()
          promise.reject(
            "ERR_SIGNER_CONFLICT",
            "Assinatura do APK baixado diverge da chave do aplicativo já instalado no aparelho.",
            null
          )
          return
        }
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
    } catch (e: SecurityException) {
      tempFile.delete()
      promise.reject("ERR_SECURITY_BLOCKED", e.message ?: "Download bloqueado por política de segurança.", e)
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
