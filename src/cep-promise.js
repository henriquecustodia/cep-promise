'use strict'

import fetchCorreios from './services/correios.js'
import fetchViaCep from './services/viacep.js'
import Promise from 'bluebird'
import CepPromiseError from './errors/cep-promise.js'

const CEP_SIZE = 8

export default function (cepRawValue) {
  return new Promise((resolve, reject) => {
    Promise.resolve(cepRawValue)
      .then(validateInputType)
      .then(removeSpecialCharacters)
      .then(validateInputLength)
      .then(leftPadWithZeros)
      .then(fetchCepFromServices)
      .then(resolvePromise)
      .catch(Promise.AggregateError, handleServicesError)
      .catch(rejectWithCepPromiseError)

    function validateInputType (cepRawValue) {
      let cepTypeOf = typeof cepRawValue

      if (cepTypeOf === 'number' || cepTypeOf === 'string') {
        return cepRawValue
      }

      throw new CepPromiseError({
        message: 'Erro ao inicializar a instância do CepPromise.',
        type: 'validation_error',
        errors: [{
          message: 'Você deve chamar o construtor utilizando uma String ou Number.',
          service: 'cep_validation'
        }]
      })
    }

    function removeSpecialCharacters (cepRawValue) {
      return cepRawValue.toString().replace(/\D+/g, '')
    }

    function leftPadWithZeros (cepCleanValue) {
      return '0'.repeat(CEP_SIZE - cepCleanValue.length) + cepCleanValue
    }

    function validateInputLength (cepWithLeftPad) {
      if (cepWithLeftPad.length <= CEP_SIZE) {
        return cepWithLeftPad
      }

      throw new CepPromiseError({
        message: 'CEP deve conter exatamente 8 caracteres.',
        type: 'validation_error',
        errors: [{
          message: 'CEP informado possui mais do que 8 caracteres.',
          service: 'cep_validation'
        }]
      })
    }

    function fetchCepFromServices (cepWithLeftPad) {
      return Promise.any([
        fetchCorreios(cepWithLeftPad),
        fetchViaCep(cepWithLeftPad)
      ])
    }

    function resolvePromise (addressObject) {
      resolve(addressObject)
    }

    function handleServicesError (aggregatedErrors) {
      const errors = aggregatedErrors.map((error) => {
        return {
          message: error.message,
          service: error.service
        }
      })

      throw new CepPromiseError({
        message: 'Todos os serviços de CEP retornaram erro.',
        type: 'service_error',
        errors: errors
      })
    }

    function rejectWithCepPromiseError (error) {
      reject(new CepPromiseError({
        message: error.message,
        type: error.type,
        errors: error.errors
      }))
    }

  })
}
