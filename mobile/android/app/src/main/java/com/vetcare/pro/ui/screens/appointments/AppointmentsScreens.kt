package com.vetcare.pro.ui.screens.appointments

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vetcare.pro.data.model.*
import com.vetcare.pro.data.remote.ApiClient
import com.vetcare.pro.data.session.CustomerSession
import com.vetcare.pro.ui.theme.BrandTeal
import com.vetcare.pro.ui.theme.StatusGreen
import com.vetcare.pro.ui.theme.StatusRed
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentsScreen(
    session: CustomerSession,
    onBackClick: () -> Unit,
    onBookAppointmentClick: () -> Unit
) {
    val token by session.token.collectAsState()
    var appointments by remember { mutableStateOf<List<Appointment>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    fun loadAppointments() {
        val t = token ?: return
        isLoading = true
        errorMessage = null
        coroutineScope.launch {
            try {
                val res = ApiClient.service.fetchMyAppointments(ApiClient.formatBearerToken(t))
                appointments = res.data.appointments
                isLoading = false
            } catch (e: Exception) {
                isLoading = false
                errorMessage = e.localizedMessage ?: "Failed to load appointments."
            }
        }
    }

    LaunchedEffect(token) {
        loadAppointments()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Appointments", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { loadAppointments() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onBookAppointmentClick,
                containerColor = BrandTeal,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Book Appointment")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandTeal)
                    }
                }
            } else if (errorMessage != null) {
                item {
                    Text(errorMessage ?: "", color = MaterialTheme.colorScheme.error)
                }
            } else if (appointments.isEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.Event, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("No appointments found", fontWeight = FontWeight.Medium)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("Tap '+' to schedule a visit for your pet.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            } else {
                val upcoming = appointments.filter { it.isUpcoming }
                val past = appointments.filter { !it.isUpcoming }

                if (upcoming.isNotEmpty()) {
                    item { Text("Upcoming", fontSize = 18.sp, fontWeight = FontWeight.Bold) }
                    items(upcoming) { appt ->
                        AppointmentCard(appt = appt, onCancel = {
                            val t = token ?: return@AppointmentCard
                            coroutineScope.launch {
                                try {
                                    ApiClient.service.cancelAppointment(appt.appointmentId, ApiClient.formatBearerToken(t))
                                    loadAppointments()
                                } catch (e: Exception) {
                                    // Handle cancel error
                                }
                            }
                        })
                    }
                }

                if (past.isNotEmpty()) {
                    item { Text("Past & Cancelled", fontSize = 18.sp, fontWeight = FontWeight.Bold) }
                    items(past) { appt ->
                        AppointmentCard(appt = appt, onCancel = null)
                    }
                }
            }
        }
    }
}

@Composable
fun AppointmentCard(
    appt: Appointment,
    onCancel: (() -> Unit)?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(40.dp).clip(CircleShape).background(BrandTeal.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.MedicalServices, contentDescription = null, tint = BrandTeal, modifier = Modifier.size(22.dp))
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(appt.petName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(appt.typeDisplayName, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                val (statusBg, statusFg) = when (appt.status) {
                    "confirmed" -> Pair(StatusGreen.copy(alpha = 0.15f), StatusGreen)
                    "cancelled" -> Pair(StatusRed.copy(alpha = 0.15f), StatusRed)
                    else -> Pair(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Surface(shape = RoundedCornerShape(8.dp), color = statusBg) {
                    Text(
                        text = appt.statusDisplayName,
                        color = statusFg,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            Divider(color = MaterialTheme.colorScheme.surfaceVariant)
            Spacer(modifier = Modifier.height(14.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CalendarToday, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(6.dp))
                Text("${appt.dateFormatted} at ${appt.timeFormatted}", fontSize = 14.sp, fontWeight = FontWeight.Medium)
            }

            appt.veterinarianName?.let { vet ->
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Dr. $vet", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            appt.reason?.let { r ->
                Spacer(modifier = Modifier.height(6.dp))
                Text("Reason: $r", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            if (onCancel != null && appt.isActiveStatus) {
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedButton(
                    onClick = onCancel,
                    modifier = Modifier.align(Alignment.End),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = StatusRed)
                ) {
                    Text("Cancel Appointment", fontSize = 12.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookAppointmentScreen(
    session: CustomerSession,
    onBackClick: () -> Unit,
    onBookingSuccess: () -> Unit
) {
    val token by session.token.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    var pets by remember { mutableStateOf<List<Pet>>(emptyList()) }
    var vets by remember { mutableStateOf<List<Veterinarian>>(emptyList()) }

    var selectedPet by remember { mutableStateOf<Pet?>(null) }
    var selectedVet by remember { mutableStateOf<Veterinarian?>(null) }
    var selectedDate by remember { mutableStateOf("2026-09-15") }
    var selectedTime by remember { mutableStateOf<TimeSlot?>(null) }
    var selectedType by remember { mutableStateOf("checkup") }
    var reason by remember { mutableStateOf("") }

    var slots by remember { mutableStateOf<List<TimeSlot>>(emptyList()) }
    var isLoadingSlots by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(token) {
        val t = token ?: return@LaunchedEffect
        try {
            val bearer = ApiClient.formatBearerToken(t)
            pets = ApiClient.service.fetchMyPets(bearer).data.pets
            if (pets.isNotEmpty()) selectedPet = pets.first()
            vets = ApiClient.service.fetchVeterinarians(bearer).data.veterinarians
        } catch (e: Exception) {
            errorMessage = "Failed to load initial booking data."
        }
    }

    LaunchedEffect(selectedDate, selectedVet, token) {
        val t = token ?: return@LaunchedEffect
        isLoadingSlots = true
        try {
            val bearer = ApiClient.formatBearerToken(t)
            val res = ApiClient.service.fetchAvailability(
                date = selectedDate,
                veterinarianId = selectedVet?.veterinarianId,
                token = bearer
            )
            slots = res.data.slots
            isLoadingSlots = false
        } catch (e: Exception) {
            isLoadingSlots = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Book Appointment", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Select Pet
                item {
                    Text("1. Select Pet", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(pets) { pet ->
                            FilterChip(
                                selected = selectedPet?.petId == pet.petId,
                                onClick = { selectedPet = pet },
                                label = { Text(pet.name) },
                                leadingIcon = { Icon(Icons.Default.Pets, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            )
                        }
                    }
                }

                // Select Vet
                item {
                    Text("2. Select Veterinarian (Optional)", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item {
                            FilterChip(
                                selected = selectedVet == null,
                                onClick = { selectedVet = null },
                                label = { Text("Any Available Vet") }
                            )
                        }
                        items(vets) { vet ->
                            FilterChip(
                                selected = selectedVet?.veterinarianId == vet.veterinarianId,
                                onClick = { selectedVet = vet },
                                label = { Text(vet.fullName) }
                            )
                        }
                    }
                }

                // Select Date
                item {
                    Text("3. Appointment Date", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = selectedDate,
                        onValueChange = { selectedDate = it },
                        label = { Text("Date (YYYY-MM-DD)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        leadingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = null) }
                    )
                }

                // Time Slots
                item {
                    Text("4. Available Time Slot", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    if (isLoadingSlots) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = BrandTeal)
                    } else if (slots.isEmpty()) {
                        Text("No available time slots for this date.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(slots) { slot ->
                                FilterChip(
                                    selected = selectedTime?.time == slot.time,
                                    onClick = { if (slot.available && slot.meetsLeadTime) selectedTime = slot },
                                    enabled = slot.available && slot.meetsLeadTime,
                                    label = { Text(slot.timeFormatted) }
                                )
                            }
                        }
                    }
                }

                // Appointment Type
                item {
                    Text("5. Appointment Type", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    val types = listOf(
                        "checkup" to "Check-up",
                        "vaccination" to "Vaccination",
                        "follow_up" to "Follow-up",
                        "consultation" to "Consultation"
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        types.forEach { (typeKey, label) ->
                            FilterChip(
                                selected = selectedType == typeKey,
                                onClick = { selectedType = typeKey },
                                label = { Text(label) }
                            )
                        }
                    }
                }

                // Reason
                item {
                    Text("6. Reason for Visit", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = reason,
                        onValueChange = { reason = it },
                        label = { Text("Brief description of concern") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        minLines = 2
                    )
                }
            }

            if (errorMessage != null) {
                Text(errorMessage ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(bottom = 8.dp))
            }

            Button(
                onClick = {
                    val p = selectedPet ?: return@Button
                    val slot = selectedTime ?: return@Button
                    val t = token ?: return@Button

                    isSubmitting = true
                    errorMessage = null
                    coroutineScope.launch {
                        try {
                            ApiClient.service.createAppointment(
                                token = ApiClient.formatBearerToken(t),
                                request = CreateAppointmentRequest(
                                    petId = p.petId,
                                    appointmentDate = selectedDate,
                                    appointmentTime = slot.time,
                                    appointmentType = selectedType,
                                    reason = reason,
                                    veterinarianId = selectedVet?.veterinarianId
                                )
                            )
                            isSubmitting = false
                            onBookingSuccess()
                        } catch (e: Exception) {
                            isSubmitting = false
                            errorMessage = e.localizedMessage ?: "Failed to book appointment."
                        }
                    }
                },
                enabled = selectedPet != null && selectedTime != null && reason.isNotBlank() && !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandTeal)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                } else {
                    Text("Confirm Appointment", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                }
            }
        }
    }
}

