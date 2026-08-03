package com.hospitalai.core.service;

import com.hospitalai.core.model.Dto.DoseRequest;
import com.hospitalai.core.model.Dto.DoseResponse;
import com.hospitalai.core.repository.WorkbenchRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DoseCalculationService {
  private final WorkbenchRepository repo;

  public DoseCalculationService(WorkbenchRepository repo) {
    this.repo = repo;
  }

  public DoseResponse calculate(DoseRequest request) {
    if (request == null || blank(request.drugCode()) || blank(request.indication()) || blank(request.patientGroup())) {
      throw new IllegalArgumentException("drugCode, indication and patientGroup are required");
    }
    var rows = repo.doseRules(request.drugCode(), request.indication(), request.patientGroup());
    if (rows.isEmpty()) {
      return new DoseResponse(request.drugCode(), request.indication(), request.patientGroup(), "rule_not_found",
          "剂量规则未发布：不得由 AI 或系统补写剂量。", "", "", List.of("请提交药师或规则管理员审核"));
    }
    var row = rows.get(0);
    var warnings = new java.util.ArrayList<String>();
    if (request.renalFunctionMissing() && Boolean.TRUE.equals(row.get("renal_adjustment_required"))) {
      warnings.add("肾功能缺失：不能计算确定性剂量");
    }
    if (request.renalFunctionMissing()) {
      warnings.add("关键检验缺失时需医生/药师复核");
    }
    return new DoseResponse(request.drugCode(), request.indication(), request.patientGroup(), "calculated_from_published_rule",
        String.valueOf(row.get("regimen_text")), String.valueOf(row.get("version")), String.valueOf(row.get("evidence_id")), warnings);
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
