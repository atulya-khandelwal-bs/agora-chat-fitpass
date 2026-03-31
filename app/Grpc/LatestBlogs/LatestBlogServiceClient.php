<?php
// GENERATED CODE -- DO NOT EDIT!

namespace LatestBlogs;

/**
 */
class LatestBlogServiceClient extends \Grpc\BaseStub {

    /**
     * @param string $hostname hostname
     * @param array $opts channel options
     * @param \Grpc\Channel $channel (optional) re-use channel object
     */
    public function __construct($hostname, $opts, $channel = null) {
        parent::__construct($hostname, $opts, $channel);
    }

    /**
     * @param \LatestBlogs\LatestBlogRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall<\LatestBlogs\Response>
     */
    public function GetLatestBlogs(\LatestBlogs\LatestBlogRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/latest_blogs.LatestBlogService/GetLatestBlogs',
        $argument,
        ['\LatestBlogs\Response', 'decode'],
        $metadata, $options);
    }

}
