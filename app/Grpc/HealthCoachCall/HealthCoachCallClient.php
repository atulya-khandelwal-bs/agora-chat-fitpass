<?php
// GENERATED CODE -- DO NOT EDIT!

namespace HealthCoachCall;

/**
 */
class HealthCoachCallClient extends \Grpc\BaseStub {

    /**
     * @param string $hostname hostname
     * @param array $opts channel options
     * @param \Grpc\Channel $channel (optional) re-use channel object
     */
    public function __construct($hostname, $opts, $channel = null) {
        parent::__construct($hostname, $opts, $channel);
    }

    /**
     * @param \HealthCoachCall\CallRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall<\HealthCoachCall\HealthCoachCallResponse>
     */
    public function ScheduleCall(\HealthCoachCall\CallRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/health_coach_call.HealthCoachCall/ScheduleCall',
        $argument,
        ['\HealthCoachCall\HealthCoachCallResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \HealthCoachCall\CallRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall<\HealthCoachCall\HealthCoachCallResponse>
     */
    public function CancelCall(\HealthCoachCall\CallRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/health_coach_call.HealthCoachCall/CancelCall',
        $argument,
        ['\HealthCoachCall\HealthCoachCallResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \HealthCoachCall\CallRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall<\HealthCoachCall\HealthCoachCallResponse>
     */
    public function UpdateCallStatus(\HealthCoachCall\CallRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/health_coach_call.HealthCoachCall/UpdateCallStatus',
        $argument,
        ['\HealthCoachCall\HealthCoachCallResponse', 'decode'],
        $metadata, $options);
    }

}
