This diagnostic is issued when a required HTTP operation parameter cannot be mapped to any generated method parameter. The generated client would have no reliable way to supply that required service parameter.

## Impact

- **Area:** Method-to-protocol parameter mapping. Blocks generation of a service method when a required HTTP parameter cannot be supplied by the generated SDK method signature.
- **Not affected:** The HTTP operation still declares the required parameter.

#### Diagnostic Message

For the case above, TCGC reports:

```text
Missing HTTP operation parameter "apiVersion" in method "getWidget". Please check the method definition.
```

#### ✅ How to Fix

Keep a matching method parameter or model property path for the HTTP parameter, or make the service parameter optional when appropriate.
