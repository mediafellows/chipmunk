export default {
  "@context":{
    "@id":"https://tuco.api.mediastore.dev/context/request",
    "@context":"https://tuco.api.mediastore.dev/context/context",
    "@type":"context",
    "properties":{
    },
    "collection_actions": {
      "get":{
        "method":"POST",
        "expects":null,
        "resource":"https://tuco.api.mediastore.dev/context/request",
        "response":"https://tuco.api.mediastore.dev/context/collection",
        "template":"https://tuco.api.mediastore.dev"
      },
      "proxy":{
        "method":"POST",
        "expects":null,
        "resource":"https://tuco.api.mediastore.dev/context/request",
        "response":"https://tuco.api.mediastore.dev/context/collection",
        "template":"https://tuco.api.mediastore.dev/proxy"
      }
    },
    "member_actions": {
      "get":{
        "method":"POST",
        "expects":null,
        "resource":"https://tuco.api.mediastore.dev/context/request",
        "response":"https://tuco.api.mediastore.dev/context/collection",
        "template":"https://tuco.api.mediastore.dev"
      }
    }
  }
}
