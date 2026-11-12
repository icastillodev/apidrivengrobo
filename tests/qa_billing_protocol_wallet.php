<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Models\Billing\BillingModel;

final class WalletDbFixture {
    public array $calls = [];
    public array $balance = [1 => 0.0, 12 => 27880.0];
    public function prepare(string $sql): WalletStmtFixture {
        return new WalletStmtFixture($this, $sql);
    }
}
final class WalletStmtFixture {
    private array $params = [];
    public function __construct(private WalletDbFixture $db, private string $sql) {}
    public function execute(array $params = []): bool {
        $this->params = $params;
        $this->db->calls[] = [$this->sql, $params];
        return true;
    }
    public function fetch(int $mode = PDO::FETCH_ASSOC): array|false {
        if (str_contains($this->sql, 'FROM protocoloexpe p')) {
            $institution = (int)($this->params[0] ?? 0);
            return ['idprotA'=>501, 'IdUsrA'=>41, 'SaldoPI'=>$this->db->balance[$institution]??0.0];
        }
        return ['saldo'=>$this->db->balance[(int)($this->params[1]??0)]??0.0];
    }
}
$ok=0; $fail=0;
function assertWallet(string $name, callable $fn): void {
    global $ok,$fail;
    try { $fn();$ok++;echo "PASS $name\n"; }
    catch (Throwable $e) { $fail++;echo 'FAIL '.$name.' '.get_class($e)."\n"; }
}
assertWallet('derived-protocol-reads-billing-institution-wallet', static function() {
    $db=new WalletDbFixture();
    $header=(new BillingModel($db))->getProtocolHeaderInfo(501, 12);
    if((float)$header['SaldoPI']!==27880.0)throw new RuntimeException();
    [$sql,$parameters]=$db->calls[0];
    if(!str_contains($sql,'din.IdUsrA = p.IdUsrA')
      || !str_contains($sql,'din.IdInstitucion = ?')
      || str_contains($sql,'p.IdInstitucion = din.IdInstitucion')
      || $parameters!==[12,501])throw new RuntimeException('Header wallet not scoped to billing institution');
});
assertWallet('other-institution-wallet-is-not-mixed', static function() {
    $db=new WalletDbFixture();
    $header=(new BillingModel($db))->getProtocolHeaderInfo(501, 1);
    if((float)$header['SaldoPI']!==0.0)throw new RuntimeException();
});
assertWallet('same-wallet-in-payment-and-header', static function() {
    $db=new WalletDbFixture();
    $model=new BillingModel($db);
    $header=$model->getProtocolHeaderInfo(501,12);
    $balance=$model->getSaldoByInvestigador($header['IdUsrA'],12);
    if((float)$header['SaldoPI']!==(float)$balance)throw new RuntimeException();
});
assertWallet('missing-billing-institution-is-rejected', static function() {
    $db=new WalletDbFixture();
    try {(new BillingModel($db))->getProtocolHeaderInfo(501,0);}
    catch(InvalidArgumentException) {if($db->calls)throw new RuntimeException('Query on invalid institution'); return;}
    throw new RuntimeException('Missing institution accepted');
});
echo "QA_BILLING_WALLET passed=$ok failed=$fail\n";
exit($fail===0?0:1);
