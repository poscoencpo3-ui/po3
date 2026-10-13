package com.wakeupcall.duo

import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlin.random.Random

/**
 * All pairing/signal state lives in a single Firestore collection "pairs",
 * one document per 6-digit connection code:
 *
 * pairs/{code} = {
 *   status: "waiting" | "connected",
 *   deviceA: { id, name },
 *   deviceB: { id, name } | null,
 *   wake: { from: "A"|"B", nonce: Long, at: serverTimestamp } | null,
 *   ack:  { nonce: Long, at: serverTimestamp } | null
 * }
 *
 * No Cloud Functions / FCM server piece is used: both phones hold a live
 * Firestore listener on their shared document (see WakeForegroundService),
 * which is enough to work on Firebase's free Spark plan.
 */
object FirestoreRepo {

    private const val COLLECTION = "pairs"

    private fun db() = FirebaseFirestore.getInstance()

    private fun randomCode(): String = Random.nextInt(0, 1_000_000).toString().padStart(6, '0')

    fun createPair(
        myDeviceId: String,
        myName: String,
        onResult: (code: String?, error: String?) -> Unit
    ) {
        tryCreate(myDeviceId, myName, attemptsLeft = 5, onResult = onResult)
    }

    private fun tryCreate(
        myDeviceId: String,
        myName: String,
        attemptsLeft: Int,
        onResult: (code: String?, error: String?) -> Unit
    ) {
        if (attemptsLeft <= 0) {
            onResult(null, "코드 생성에 실패했어요. 다시 시도해주세요.")
            return
        }
        val code = randomCode()
        val docRef = db().collection(COLLECTION).document(code)
        docRef.get()
            .addOnSuccessListener { snapshot ->
                if (snapshot.exists()) {
                    tryCreate(myDeviceId, myName, attemptsLeft - 1, onResult)
                } else {
                    val data = hashMapOf<String, Any?>(
                        "status" to "waiting",
                        "deviceA" to hashMapOf("id" to myDeviceId, "name" to myName),
                        "deviceB" to null,
                        "wake" to null,
                        "ack" to null,
                        "createdAt" to FieldValue.serverTimestamp()
                    )
                    docRef.set(data)
                        .addOnSuccessListener { onResult(code, null) }
                        .addOnFailureListener { e -> onResult(null, e.message) }
                }
            }
            .addOnFailureListener { e -> onResult(null, e.message) }
    }

    fun joinPair(
        code: String,
        myDeviceId: String,
        myName: String,
        onResult: (partnerName: String?, error: String?) -> Unit
    ) {
        val docRef = db().collection(COLLECTION).document(code)
        docRef.get()
            .addOnSuccessListener { snapshot ->
                if (!snapshot.exists()) {
                    onResult(null, "존재하지 않는 코드예요. 코드를 다시 확인해주세요.")
                    return@addOnSuccessListener
                }
                @Suppress("UNCHECKED_CAST")
                val deviceA = snapshot.get("deviceA") as? Map<String, Any?>
                if (snapshot.get("deviceB") != null) {
                    onResult(null, "이미 다른 기기와 연결된 코드예요.")
                    return@addOnSuccessListener
                }
                val partnerName = (deviceA?.get("name") as? String).orEmpty()
                docRef.update(
                    mapOf(
                        "deviceB" to hashMapOf("id" to myDeviceId, "name" to myName),
                        "status" to "connected"
                    )
                ).addOnSuccessListener {
                    onResult(partnerName, null)
                }.addOnFailureListener { e ->
                    onResult(null, e.message)
                }
            }
            .addOnFailureListener { e -> onResult(null, e.message) }
    }

    fun sendWake(code: String, myRole: String, onResult: (success: Boolean, nonce: Long) -> Unit) {
        val nonce = System.currentTimeMillis()
        val docRef = db().collection(COLLECTION).document(code)
        docRef.update(
            mapOf(
                "wake" to hashMapOf(
                    "from" to myRole,
                    "nonce" to nonce,
                    "at" to FieldValue.serverTimestamp()
                )
            )
        ).addOnSuccessListener { onResult(true, nonce) }
            .addOnFailureListener { onResult(false, nonce) }
    }

    fun sendAck(code: String, nonce: Long) {
        val docRef = db().collection(COLLECTION).document(code)
        docRef.update(
            mapOf(
                "ack" to hashMapOf(
                    "nonce" to nonce,
                    "at" to FieldValue.serverTimestamp()
                )
            )
        )
    }

    fun listenPair(code: String, listener: (DocumentSnapshot?) -> Unit): ListenerRegistration {
        return db().collection(COLLECTION).document(code)
            .addSnapshotListener { snapshot, _ -> listener(snapshot) }
    }
}
