<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl mx-4 p-8 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-semibold text-nyingarn-dark mb-6 text-center">
          Access Conditions
        </h2>

        <div class="text-gray-700 text-sm space-y-2">
          <p>
            Unless otherwise stated, this work is licensed under a
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank"
              class="text-sm text-blue-600 hover:underline">
              Creative Commons Attribution-NonCommercial-ShareAlike 4.0
              International License
            </a>.
            The moral rights of the creators are asserted.
          </p>

          <p>
            Takedown Principle: Nyingarn has made every effort to consult with relevant language authorities to
            determine appropriate access. Should you notice anything inappropriate, please contact our team and we will
            immediately remove access to the content.
          </p>

          <p>
            If you are not sure about the copyright status of the material you want to to work with, please see the
            advice pages prepared by the Attorney-General’s Department
            <a href="https://www.ag.gov.au/rights-and-protections/publications/duration-copyright-table" target="_blank"
              class="text-sm text-blue-600 hover:underline">
              here
            </a>
            .
          </p>

          <p>
            Access to data is subject to Nyingarn’s Conditions of Access (as below).
          </p>

          <p>
            The following are general conditions for obtaining material from the Nyingarn platform. They assume that the
            depositor’s permission has been obtained for copying. Specific restrictions accompany each item in Nyingarn.
          </p>

          <p>
            This is an online agreement that you can click before getting access to items in the collection via our
            catalog.
          </p>

          <h3 class="font-semibold text-nyingarn-dark mt-6">
            General Conditions of Access
          </h3>
          <p>
            In consideration of Nyingarn agreeing to supply me with certain data in machine-readable form together with
            supporting documentation, I hereby undertake:
          </p>

          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>Purpose:</strong>
              To use the data for purposes of private scholarly research and/or for purposes of educational use, and not
              for profit (this shall not preclude the publication in a scholarly context of analyses or interpretations
              derived from the data, unless such publication is precluded by the conditions of deposit of the data in
              the Nyingarn).
            </li>
            <li>
              <strong>Acknowledgement:</strong>
              To acknowledge in any work, published or unpublished, based in whole or in part on analyses of the data,
              both the original depositors of the data and Nyingarn (by use of the Nyingarn persistent identifier and
              citation form).
            </li>
            <li>
              <strong>Copyright:</strong> Not to copy the data in whole or in part except insofar as this may be
              necessary for security purposes or for my own personal use. Not to distribute the data to third parties,
              nor to publish or reproduce it in any way. Copyright of all machine-readable data issued by Nyingarn is
              reserved.
            </li>
            <li>
              <strong>Access:</strong>
              To give access to the data only to persons directly associated with me or working under my control and to
              require of such persons signed undertakings neither to use the data except in connection with my academic
              or educational purposes, nor to give access to the datas to others; these signed undertakings to be made
              available to Nyingarn on request
            </li>
            <li>
              Not to give access to any third party if the conditions of deposit preclude this.
            </li>
            <li>
              <strong>Errors:</strong>
              Not to hold Nyingarn liable for any errors of transcription or marking-up which may be found in the data,
              but to notify Nyingarn of such errors wherever possible.
            </li>
            <li>
              <strong>Revisions:</strong>
              Where substantial revisions or reformatting of the data is permitted by the conditions of deposit and
              carried out as a part of my research, to inform Nyingarn, and also the original depositor if this is a
              condition of deposit, of the nature of such revisions and to deposit any such revised version at Nyingarn
              subject to the conditions of deposit of the original.
            </li>
            <li>
              <strong>Transcriptions:</strong>
              To provide your transcripts as Public Domain material, licensed under the same CC-licence as specfied
              above.
            </li>
          </ul>
        </div>

        <div class="mt-6 text-center">
          <ElButton type="primary" @click="handleAccept">
            I Accept These Conditions
          </ElButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ElButton } from "element-plus";

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["accept"]);

const handleAccept = () => {
  emit("accept");
};
</script>
