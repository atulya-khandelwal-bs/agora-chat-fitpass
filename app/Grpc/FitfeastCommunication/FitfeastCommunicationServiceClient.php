<?php
// GENERATED CODE -- DO NOT EDIT!

namespace FitfeastCommunication;

/**
 */
class FitfeastCommunicationServiceClient extends \Grpc\BaseStub {

    /**
     * @param string $hostname hostname
     * @param array $opts channel options
     * @param \Grpc\Channel $channel (optional) re-use channel object
     */
    public function __construct($hostname, $opts, $channel = null) {
        parent::__construct($hostname, $opts, $channel);
    }

    /**
     * @param \FitfeastCommunication\CustomerDietAssignNotificationRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall<\FitfeastCommunication\Response>
     */
    public function DietAssignNotification(\FitfeastCommunication\CustomerDietAssignNotificationRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/fitfeast_communication.FitfeastCommunicationService/DietAssignNotification',
        $argument,
        ['\FitfeastCommunication\Response', 'decode'],
        $metadata, $options);
    }

}
