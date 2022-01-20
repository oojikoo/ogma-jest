# How to reproduce

- setup posetgersql at local

- update all db credential and info for testing

  ```
  MikroOrmModule.forRoot({
    ...  <- update these values in the project
  })
  ```

  

- run test

```
$ yarn 
$ nx test payment-svc --verbose  --detectOpenHandles
```



## Desccription

without this line all tests pass...

```
# apps/payment-svc/test/payment.spec.ts
jest.mock('uuid', () => ({ v4: () => '00000000-0000-0000-0000-000000000000' }));
```

