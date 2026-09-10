package com.vetcare.pro.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private fun String.capitalizeFirst(): String {
    return this.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.US) else it.toString() }
}

@Serializable
data class CustomerLoginRequest(
    val identifier: String,
    val password: String
)

@Serializable
data class CustomerLoginResponse(
    val status: String? = null,
    val message: String? = null,
    val data: CustomerLoginData
)

@Serializable
data class CustomerLoginData(
    val customer: Customer,
    val token: String
)

@Serializable
data class Customer(
    @SerialName("customer_id") val customerId: String,
    @SerialName("first_name") val firstName: String,
    @SerialName("last_name") val lastName: String,
    val email: String? = null,
    val phone: String,
    @SerialName("alternate_phone") val alternatePhone: String? = null,
    val address: String? = null,
    val city: String? = null,
    val nic: String? = null,
    @SerialName("preferred_contact_method") val preferredContactMethod: String? = null,
    @SerialName("emergency_contact") val emergencyContact: String? = null,
    @SerialName("emergency_phone") val emergencyPhone: String? = null,
    @SerialName("password_must_change") val passwordMustChange: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null
) {
    val fullName: String get() = "$firstName $lastName"

    val initials: String
        get() = "${firstName.take(1)}${lastName.take(1)}".uppercase()

    val memberSince: String?
        get() {
            val raw = createdAt ?: return null
            return try {
                val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val date = parser.parse(raw.take(10))
                val cal = java.util.Calendar.getInstance()
                if (date != null) cal.time = date
                cal.get(java.util.Calendar.YEAR).toString()
            } catch (e: Exception) {
                null
            }
        }
}

@Serializable
data class PetsResponse(
    val status: String? = null,
    val data: PetsData
)

@Serializable
data class PetsData(
    val pets: List<Pet>
)

@Serializable
data class Pet(
    @SerialName("pet_id") val petId: String,
    @SerialName("pet_name") val name: String,
    val species: String,
    val breed: String? = null,
    val gender: String? = null,
    @SerialName("date_of_birth") val dateOfBirth: String? = null,
    val color: String? = null,
    @SerialName("weight_current") val weightCurrent: String? = null,
    @SerialName("is_neutered") val isNeutered: Boolean = false,
    val allergies: String? = null,
    @SerialName("special_needs") val specialNeeds: String? = null
) {
    val ageString: String?
        get() {
            val raw = dateOfBirth ?: return null
            return try {
                val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val date = fmt.parse(raw.take(10)) ?: return null
                val now = Date()
                val diffMs = now.time - date.time
                val days = diffMs / (1000 * 60 * 60 * 24)
                val years = days / 365
                if (years > 0) "$years y old"
                else {
                    val months = days / 30
                    if (months > 0) "$months mo old" else null
                }
            } catch (e: Exception) {
                null
            }
        }

    val dobFormatted: String?
        get() {
            val raw = dateOfBirth ?: return null
            return try {
                val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val date = parser.parse(raw.take(10)) ?: return null
                val out = SimpleDateFormat("MMM d, yyyy", Locale.US)
                out.format(date)
            } catch (e: Exception) {
                null
            }
        }

    val weightDisplay: String?
        get() {
            val w = weightCurrent?.toDoubleOrNull() ?: return null
            if (w <= 0) return null
            return if (w % 1.0 == 0.0) String.format(Locale.US, "%.0f kg", w)
            else String.format(Locale.US, "%.1f kg", w)
        }
}

@Serializable
data class VaccinationsResponse(
    val status: String,
    val vaccinations: List<Vaccination>
)

@Serializable
data class Vaccination(
    @SerialName("vaccination_id") val vaccinationId: Int,
    @SerialName("vaccine_name") val vaccineName: String,
    @SerialName("vaccine_type") val vaccineType: String? = null,
    @SerialName("vaccination_date") val vaccinationDate: String,
    @SerialName("next_due_date") val nextDueDate: String? = null,
    @SerialName("adverse_reaction") val adverseReaction: Boolean = false,
    val notes: String? = null,
    @SerialName("administered_by_name") val administeredByName: String? = null
) {
    enum class DueStatus { OVERDUE, UPCOMING }

    val dueStatus: DueStatus?
        get() {
            val raw = nextDueDate ?: return null
            return try {
                val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val dueDate = fmt.parse(raw.take(10)) ?: return null
                if (dueDate.before(Date())) DueStatus.OVERDUE else DueStatus.UPCOMING
            } catch (e: Exception) {
                null
            }
        }

    val vaccinationDateFormatted: String
        get() {
            return try {
                val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val date = fmt.parse(vaccinationDate.take(10)) ?: return vaccinationDate
                val out = SimpleDateFormat("MMM d, yyyy", Locale.US)
                out.format(date)
            } catch (e: Exception) {
                vaccinationDate
            }
        }

    val nextDueDateFormatted: String?
        get() {
            val raw = nextDueDate ?: return null
            return try {
                val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val date = fmt.parse(raw.take(10)) ?: return raw
                val out = SimpleDateFormat("MMM d, yyyy", Locale.US)
                out.format(date)
            } catch (e: Exception) {
                raw
            }
        }
}

@Serializable
data class LabReportsResponse(
    val status: String,
    val reports: List<LabReport>
)

@Serializable
data class LabReport(
    @SerialName("report_id") val reportId: Int,
    @SerialName("pet_id") val petId: String,
    @SerialName("report_name") val reportName: String,
    @SerialName("report_type") val reportType: String,
    @SerialName("file_type") val fileType: String,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String
) {
    val typeDisplayName: String
        get() = when (reportType) {
            "blood_test" -> "Blood Test"
            "urinalysis" -> "Urinalysis"
            "kidney_panel" -> "Kidney Panel"
            "x_ray" -> "X-Ray"
            "ultrasound" -> "Ultrasound"
            "cytology" -> "Cytology"
            "biopsy" -> "Biopsy"
            "culture" -> "Culture"
            else -> "Other"
        }

    val formattedDate: String
        get() {
            return try {
                val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val date = parser.parse(createdAt.take(10)) ?: return createdAt.take(10)
                val out = SimpleDateFormat("MMM d, yyyy", Locale.US)
                out.format(date)
            } catch (e: Exception) {
                createdAt.take(10)
            }
        }
}

@Serializable
data class ChangePasswordFirstLoginRequest(
    @SerialName("newPassword") val newPassword: String
)

@Serializable
data class ChangePasswordRequest(
    @SerialName("currentPassword") val currentPassword: String,
    @SerialName("newPassword") val newPassword: String
)

@Serializable
data class AckResponse(
    val status: String,
    val message: String? = null
)

@Serializable
data class VerifyIdentityRequest(
    val email: String,
    val phone: String
)

@Serializable
data class VerifyIdentityResponse(
    val status: String? = null,
    val data: VerifyIdentityData
)

@Serializable
data class VerifyIdentityData(
    @SerialName("setupToken") val setupToken: String,
    @SerialName("firstName") val firstName: String
)

@Serializable
data class SetFirstPasswordRequest(
    @SerialName("setupToken") val setupToken: String,
    @SerialName("newPassword") val newPassword: String
)

@Serializable
data class Appointment(
    @SerialName("appointment_id") val appointmentId: String,
    @SerialName("pet_id") val petId: String,
    @SerialName("appointment_date") val appointmentDate: String,
    @SerialName("appointment_time") val appointmentTime: String,
    @SerialName("duration_minutes") val durationMinutes: Int = 30,
    @SerialName("appointment_type") val appointmentType: String,
    val reason: String? = null,
    val status: String,
    @SerialName("cancellation_reason") val cancellationReason: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("veterinarian_id") val veterinarianId: Int? = null,
    @SerialName("veterinarian_name") val veterinarianName: String? = null,
    @SerialName("pet_name") val petName: String = "",
    val species: String = ""
) {
    val dateFormatted: String
        get() {
            return try {
                val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                parser.timeZone = TimeZone.getTimeZone("UTC")
                val date = parser.parse(appointmentDate.take(10)) ?: return appointmentDate.take(10)
                val out = SimpleDateFormat("MMM d, yyyy", Locale.US)
                out.format(date)
            } catch (e: Exception) {
                appointmentDate.take(10)
            }
        }

    val timeFormatted: String
        get() {
            return try {
                val parser = SimpleDateFormat("HH:mm", Locale.US)
                val date = parser.parse(appointmentTime.take(5)) ?: return appointmentTime.take(5)
                val out = SimpleDateFormat("h:mm a", Locale.US)
                out.format(date)
            } catch (e: Exception) {
                appointmentTime.take(5)
            }
        }

    val typeDisplayName: String
        get() = when (appointmentType) {
            "checkup" -> "Check-up"
            "vaccination" -> "Vaccination"
            "follow_up" -> "Follow-up"
            "consultation" -> "Consultation"
            else -> appointmentType.replace("_", " ").capitalizeFirst()
        }

    val statusDisplayName: String
        get() = when (status) {
            "confirmed" -> "Confirmed"
            "scheduled" -> "Scheduled"
            "in_progress" -> "In Progress"
            "completed" -> "Completed"
            "cancelled" -> "Cancelled"
            "no_show" -> "No Show"
            else -> status.replace("_", " ").capitalizeFirst()
        }

    val isActiveStatus: Boolean
        get() = status == "confirmed" || status == "scheduled"

    val isUpcoming: Boolean
        get() = isActiveStatus || status == "in_progress"
}

@Serializable
data class AppointmentsResponse(
    val status: String,
    val data: AppointmentsData
)

@Serializable
data class AppointmentsData(
    val appointments: List<Appointment>
)

@Serializable
data class AppointmentSingleResponse(
    val status: String,
    val message: String? = null,
    val data: AppointmentSingleData
)

@Serializable
data class AppointmentSingleData(
    val appointment: Appointment
)

@Serializable
data class Veterinarian(
    @SerialName("veterinarian_id") val veterinarianId: Int,
    @SerialName("first_name") val firstName: String,
    @SerialName("last_name") val lastName: String,
    val specialization: String? = null
) {
    val fullName: String get() = "Dr. $firstName $lastName"
}

@Serializable
data class VeterinariansResponse(
    val status: String,
    val data: VeterinariansData
)

@Serializable
data class VeterinariansData(
    val veterinarians: List<Veterinarian>
)

@Serializable
data class AvailabilityResponse(
    val status: String,
    val data: AvailabilityData
)

@Serializable
data class AvailabilityData(
    val date: String,
    @SerialName("isClinicDay") val isClinicDay: Boolean = true,
    val slots: List<TimeSlot>
)

@Serializable
data class TimeSlot(
    val time: String,
    @SerialName("remainingCapacity") val remainingCapacity: Int = 3,
    val available: Boolean = true,
    @SerialName("meetsLeadTime") val meetsLeadTime: Boolean = true
) {
    val timeFormatted: String
        get() {
            return try {
                val parser = SimpleDateFormat("HH:mm", Locale.US)
                val date = parser.parse(time.take(5)) ?: return time
                val out = SimpleDateFormat("h:mm a", Locale.US)
                out.format(date)
            } catch (e: Exception) {
                time
            }
        }
}

@Serializable
data class CreateAppointmentRequest(
    @SerialName("pet_id") val petId: String,
    @SerialName("appointment_date") val appointmentDate: String,
    @SerialName("appointment_time") val appointmentTime: String,
    @SerialName("appointment_type") val appointmentType: String,
    val reason: String,
    @SerialName("veterinarian_id") val veterinarianId: Int? = null
)

@Serializable
data class UpdateAppointmentRequest(
    @SerialName("appointment_date") val appointmentDate: String,
    @SerialName("appointment_time") val appointmentTime: String,
    @SerialName("appointment_type") val appointmentType: String,
    val reason: String,
    @SerialName("veterinarian_id") val veterinarianId: Int? = null
)

@Serializable
data class CancelAppointmentRequest(
    val reason: String? = null
)

@Serializable
data class UpdateProfileRequest(
    @SerialName("alternate_phone") val alternatePhone: String? = null,
    val address: String? = null,
    val city: String? = null,
    @SerialName("preferred_contact_method") val preferredContactMethod: String? = null,
    @SerialName("emergency_contact") val emergencyContact: String? = null,
    @SerialName("emergency_phone") val emergencyPhone: String? = null
)

@Serializable
data class CustomerUpdateResponse(
    val status: String,
    val data: CustomerUpdateData
)

@Serializable
data class CustomerUpdateData(
    val customer: Customer
)

@Serializable
data class PhotoGuidanceJob(
    @SerialName("job_id") val jobId: Int,
    @SerialName("pet_id") val petId: String,
    @SerialName("owner_note") val ownerNote: String? = null,
    val status: String,
    @SerialName("guidance_text") val guidanceText: String? = null,
    @SerialName("error_message") val errorMessage: String? = null,
    @SerialName("created_at") val createdAt: String? = null
) {
    val isFinished: Boolean get() = status == "completed" || status == "failed"

    val statusDisplay: String
        get() = when (status) {
            "pending" -> "Waiting to start…"
            "processing" -> "Analyzing photo…"
            "completed" -> "Ready"
            "failed" -> "Failed"
            else -> status.capitalizeFirst()
        }
}

@Serializable
data class PhotoGuidanceSubmitResponse(
    val job: PhotoGuidanceJob
)

@Serializable
data class PhotoGuidanceStatusResponse(
    val job: PhotoGuidanceJob
)

@Serializable
data class PhotoGuidanceHistoryResponse(
    val jobs: List<PhotoGuidanceJob>
)

