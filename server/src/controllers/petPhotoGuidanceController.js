import fs from 'fs';
import { createJob, getJobForCustomer, listJobsForCustomerPet } from '../models/petPhotoGuidanceModel.js';
import { getPetById } from '../models/petModel.js';
import { submitPhotoGuidanceJob } from '../services/aiService.js';

/**
 * Pet-owner AI photo guidance: submit a pet photo and get async,
 * non-diagnostic AI guidance. Generation takes ~3 minutes (vision model),
 * far longer than any other AI call in this app, so this is submit-now /
 * poll-later rather than a blocking request - see database/migrations/
 * add_pet_photo_guidance.sql and ml/scripts/rag/photo_guidance.py.
 */

/**
 * @route   POST /api/customer-auth/pets/:petId/ai-photo-guidance
 * @desc    Submit a pet photo for AI guidance. Responds as soon as the job
 *          is recorded - the ML service processes it in the background.
 * @access  Private (customer)
 */
export const submitPhotoGuidance = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No photo uploaded' });
    }

    const { petId } = req.params;
    const pet = await getPetById(petId);
    if (!pet || pet.customer_id !== req.customer.customer_id) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ status: 'error', message: 'Pet not found on your account' });
    }

    const photoPath = `pet-ai-photos/${req.file.filename}`;
    const job = await createJob({
      petId,
      customerId: req.customer.customer_id,
      photoPath,
      ownerNote: req.body.note
    });

    submitPhotoGuidanceJob(job.job_id, photoPath, job.owner_note, petId, req.customer.customer_id).catch(() => {});

    res.status(202).json({ status: 'success', job });
  } catch (err) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    console.error('❌ submitPhotoGuidance error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to submit photo for AI guidance' });
  }
};

/**
 * @route   GET /api/customer-auth/ai-photo-guidance/:jobId
 * @desc    Poll a submitted job's status/result
 * @access  Private (customer)
 */
export const getPhotoGuidanceStatus = async (req, res) => {
  try {
    const job = await getJobForCustomer(req.params.jobId, req.customer.customer_id);
    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Job not found' });
    }
    res.status(200).json({ status: 'success', job });
  } catch (err) {
    console.error('❌ getPhotoGuidanceStatus error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch job status' });
  }
};

/**
 * @route   GET /api/customer-auth/pets/:petId/ai-photo-guidance
 * @desc    List past AI photo guidance submissions for one of the
 *          customer's own pets
 * @access  Private (customer)
 */
export const listPhotoGuidanceHistory = async (req, res) => {
  try {
    const { petId } = req.params;
    const pet = await getPetById(petId);
    if (!pet || pet.customer_id !== req.customer.customer_id) {
      return res.status(404).json({ status: 'error', message: 'Pet not found on your account' });
    }

    const jobs = await listJobsForCustomerPet(petId, req.customer.customer_id);
    res.status(200).json({ status: 'success', jobs });
  } catch (err) {
    console.error('❌ listPhotoGuidanceHistory error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch photo guidance history' });
  }
};
